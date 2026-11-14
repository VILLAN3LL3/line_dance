import { getQuery, allQuery } from '../../scripts/db.ts';

const dbName = 'danceGroups';

export function listLearnedChoreographies(groupId) {
  const filter = groupId ? ' WHERE dance_group_id = ?' : '';
  return allQuery(
    `SELECT * FROM learned_choreographies${filter} ORDER BY dance_group_name, last_danced_date DESC`,
    groupId ? [groupId] : [],
    dbName,
  );
}

export function findGroup(groupId) {
  return getQuery(
    'SELECT id, max_group_level_value FROM dance_groups WHERE id = ?',
    [groupId],
    dbName,
  );
}

export function findSession(sessionId) {
  return getQuery(
    'SELECT id, dance_course_id, session_date FROM sessions WHERE id = ?',
    [sessionId],
    dbName,
  );
}

export function findCourse(courseId) {
  return getQuery('SELECT id, dance_group_id FROM dance_courses WHERE id = ?', [courseId], dbName);
}

export function findLearnedChoreographies(groupId, today) {
  return allQuery(
    `SELECT choreography_id FROM learned_choreographies
     WHERE dance_group_id = ? AND first_learned_date < ?`,
    [groupId, today],
    dbName,
  );
}

export function findPriorSessionChoreographies(groupId, date) {
  return allQuery(
    `SELECT DISTINCT sc.choreography_id
     FROM sessions s
     INNER JOIN session_choreographies sc ON s.id = sc.session_id
     INNER JOIN dance_courses dc ON s.dance_course_id = dc.id
     WHERE dc.dance_group_id = ? AND s.session_date < ?`,
    [groupId, date],
    dbName,
  );
}

export function findBaseFigures(groupId) {
  return allQuery(
    'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ?',
    [groupId],
    dbName,
  );
}

export function findChoreographyFigures(choreographyIds) {
  if (choreographyIds.length === 0) return Promise.resolve([]);
  return allQuery(
    `SELECT DISTINCT csf.step_figure_id AS id
     FROM choreography_step_figures csf
     WHERE csf.choreography_id IN (${choreographyIds.map(() => '?').join(',')})`,
    choreographyIds,
  );
}

export function findExpandedFigures(ids) {
  if (ids.length === 0) return Promise.resolve([]);
  return allQuery(
    `WITH RECURSIVE known_ids(id) AS (
       SELECT id FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')})
       UNION
       SELECT sfc.child_step_figure_id
       FROM step_figure_components sfc
       INNER JOIN known_ids ON known_ids.id = sfc.parent_step_figure_id
     )
     SELECT sf.name
     FROM step_figures sf
     INNER JOIN known_ids ON known_ids.id = sf.id
     ORDER BY LOWER(sf.name) ASC`,
    ids,
  );
}

export function findSuggestions(namesLower, maxLevelValue) {
  const knownFiguresCte =
    namesLower.length === 0
      ? 'SELECT NULL AS name_lower WHERE 1=0'
      : namesLower.map(() => 'SELECT ? AS name_lower').join('\n       UNION\n       ');
  const levelCondition = maxLevelValue === null ? '' : 'AND (l.value IS NOT NULL AND l.value <= ?)';
  const params = maxLevelValue === null ? namesLower : [...namesLower, maxLevelValue];
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
