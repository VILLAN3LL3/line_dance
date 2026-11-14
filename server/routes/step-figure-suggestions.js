import { getQuery, allQuery } from '../scripts/db.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const dbName = 'danceGroups';

// Learned Choreographies view

/**
 * Builds the known_figures CTE fragment and parameter list for step figure suggestion queries.
 * Merges step figures from already-known choreographies with the group's base step figures, then
 * expands the set downward through the parent→child hierarchy: knowing a parent figure implies
 * knowing all of its (recursive) child components.
 *
 * @param {number} groupId - Dance group ID (used to fetch base step figures)
 * @param {number[]} knownChoreoIds - Choreography IDs already known/danced by the group
 * @returns {Promise<{ knownFiguresCte: string, cteParams: string[], known_step_figures: string[] }>}
 */
async function buildKnownStepFiguresCte(groupId, knownChoreoIds) {
  const baseStepFigureRows = await allQuery(
    'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ?',
    [groupId],
    dbName,
  );
  const baseStepFigureIds = baseStepFigureRows.map((r) => r.step_figure_id);

  const choreoFigureRows =
    knownChoreoIds.length > 0
      ? await allQuery(
          `SELECT DISTINCT csf.step_figure_id AS id
           FROM choreography_step_figures csf
           WHERE csf.choreography_id IN (${knownChoreoIds.map(() => '?').join(',')})`,
          knownChoreoIds,
        )
      : [];
  const choreoFigureIds = choreoFigureRows.map((r) => r.id);

  // Directly-known step figure ids: figures from already-known choreographies + group base figures.
  const seedIds = [...new Set([...choreoFigureIds, ...baseStepFigureIds])];

  if (seedIds.length === 0) {
    return {
      knownFiguresCte: 'SELECT NULL AS name_lower WHERE 1=0',
      cteParams: [],
      known_step_figures: [],
    };
  }

  // Walk the parent→child hierarchy so that any child component of a known parent figure is also
  // treated as known.
  const expandedRows = await allQuery(
    `WITH RECURSIVE known_ids(id) AS (
       SELECT id FROM step_figures WHERE id IN (${seedIds.map(() => '?').join(',')})
       UNION
       SELECT sfc.child_step_figure_id
       FROM step_figure_components sfc
       INNER JOIN known_ids ON known_ids.id = sfc.parent_step_figure_id
     )
     SELECT sf.name
     FROM step_figures sf
     INNER JOIN known_ids ON known_ids.id = sf.id
     ORDER BY LOWER(sf.name) ASC`,
    seedIds,
  );

  const known_step_figures = [...new Set(expandedRows.map((r) => r.name))];
  const namesLower = [...new Set(expandedRows.map((r) => r.name.toLowerCase()))];

  const knownFiguresCte = namesLower
    .map(() => 'SELECT ? AS name_lower')
    .join('\n       UNION\n       ');

  return {
    knownFiguresCte,
    cteParams: namesLower,
    known_step_figures,
  };
}

async function findSuggestions(knownFiguresCte, cteParams, maxLevelValue) {
  const levelCondition = maxLevelValue === null ? '' : 'AND (l.value IS NOT NULL AND l.value <= ?)';
  const params = maxLevelValue === null ? cteParams : [...cteParams, maxLevelValue];
  return allQuery(
    `WITH known_figures AS (
       ${knownFiguresCte}
     ),
     candidate_choreographies AS (
       SELECT
         MIN(CASE WHEN LOWER(sf.name) NOT IN (SELECT name_lower FROM known_figures)
             THEN sf.name END) AS missing_figure
       FROM choreographies c
       INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
       INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
       LEFT JOIN levels l ON c.level_id = l.id
       WHERE 1=1 ${levelCondition}
       GROUP BY c.id
       HAVING SUM(CASE WHEN LOWER(sf.name) NOT IN (SELECT name_lower FROM known_figures)
                  THEN 1 ELSE 0 END) = 1
     )
     SELECT missing_figure AS step_figure, COUNT(*) AS additional_choreographies
     FROM candidate_choreographies
     GROUP BY LOWER(missing_figure)
     ORDER BY additional_choreographies DESC, step_figure ASC
     LIMIT 5`,
    params,
  );
}

export async function getLearnedChoreographies(req, res) {
  try {
    const { dance_group_id } = req.query;

    let query = `SELECT * FROM learned_choreographies`;
    let params = [];

    if (dance_group_id) {
      query += ` WHERE dance_group_id = ?`;
      params.push(dance_group_id);
    }

    query += ` ORDER BY dance_group_name, last_danced_date DESC`;

    const rows = await allQuery(query, params, dbName);
    res.json(rows);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch learned choreographies' });
  }
}

export async function getStepFigureSuggestions(req, res) {
  try {
    const groupId = Number.parseInt(req.params.groupId, 10);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const maxLevelValue = (() => {
      const parsed = Number.parseInt(String(req.query.max_level_value), 10);
      return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
    })();

    const group = await getQuery('SELECT id FROM dance_groups WHERE id = ?', [groupId], dbName);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Approximate Berlin time (UTC+2) to match client-side date logic
    const berlinNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const todayIso = berlinNow.toISOString().slice(0, 10);

    const learnedRows = await allQuery(
      `SELECT choreography_id FROM learned_choreographies
       WHERE dance_group_id = ? AND first_learned_date < ?`,
      [groupId, todayIso],
      dbName,
    );
    const learnedChoreographyIds = learnedRows.map((r) => r.choreography_id);

    const { knownFiguresCte, cteParams } = await buildKnownStepFiguresCte(
      groupId,
      learnedChoreographyIds,
    );

    const suggestions = await findSuggestions(knownFiguresCte, cteParams, maxLevelValue);

    res.json(suggestions);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to compute step figure suggestions' });
  }
}

export async function getSessionStepFigureSuggestions(req, res) {
  try {
    const sessionId = Number.parseInt(req.params.sessionId, 10);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = await getQuery(
      'SELECT id, dance_course_id, session_date FROM sessions WHERE id = ?',
      [sessionId],
      dbName,
    );
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const course = await getQuery(
      'SELECT id, dance_group_id FROM dance_courses WHERE id = ?',
      [session.dance_course_id],
      dbName,
    );
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const berlinNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const todayIso = berlinNow.toISOString().slice(0, 10);

    const [learnedRows, priorSessionChoreoRows] = await Promise.all([
      allQuery(
        `SELECT choreography_id FROM learned_choreographies
         WHERE dance_group_id = ? AND first_learned_date < ?`,
        [course.dance_group_id, todayIso],
        dbName,
      ),
      allQuery(
        `SELECT DISTINCT sc.choreography_id
         FROM sessions s
         INNER JOIN session_choreographies sc ON s.id = sc.session_id
         INNER JOIN dance_courses dc ON s.dance_course_id = dc.id
         WHERE dc.dance_group_id = ? AND s.session_date < ?`,
        [course.dance_group_id, session.session_date],
        dbName,
      ),
    ]);

    const allKnownChoreoIds = [
      ...new Set([
        ...learnedRows.map((r) => r.choreography_id),
        ...priorSessionChoreoRows.map((r) => r.choreography_id),
      ]),
    ];

    const [group, knownStepData] = await Promise.all([
      getQuery(
        'SELECT max_group_level_value FROM dance_groups WHERE id = ?',
        [course.dance_group_id],
        dbName,
      ),
      buildKnownStepFiguresCte(course.dance_group_id, allKnownChoreoIds),
    ]);
    const { knownFiguresCte, cteParams, known_step_figures } = knownStepData;

    const max_level_value = group?.max_group_level_value ?? null;
    const suggestions = await findSuggestions(knownFiguresCte, cteParams, max_level_value);

    res.json({ suggestions, known_step_figures, max_level_value });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to compute session step figure suggestions' });
  }
}
