import { getQuery, allQuery } from '../../scripts/db.ts';
import type { Suggestion, prepareLearnedGroupId } from './operations.ts';

type LearnedChoreography = {
  dance_group_id: number;
  dance_group_name: string;
  choreography_id: number;
  times_danced: number;
  first_learned_date: string | null;
  last_danced_date: string | null;
};
type Group = { id: number; max_group_level_value: number | null };
type Session = { id: number; dance_course_id: number; session_date: string };
type Course = { id: number; dance_group_id: number };
type ChoreographyId = { choreography_id: number };

const dbName = 'danceGroups' as const;

export async function listLearnedChoreographies(
  groupId: ReturnType<typeof prepareLearnedGroupId>['value'],
): Promise<LearnedChoreography[]> {
  const filter = groupId ? ' WHERE dance_group_id = ?' : '';
  return allQuery<LearnedChoreography>(
    `SELECT * FROM learned_choreographies${filter} ORDER BY dance_group_name, last_danced_date DESC`,
    groupId ? [groupId] : [],
    dbName,
  );
}

export async function findGroup(groupId: number): Promise<Group | undefined> {
  return getQuery<Group>(
    'SELECT id, max_group_level_value FROM dance_groups WHERE id = ?',
    [groupId],
    dbName,
  );
}

export async function findSession(sessionId: number): Promise<Session | undefined> {
  return getQuery<Session>(
    'SELECT id, dance_course_id, session_date FROM sessions WHERE id = ?',
    [sessionId],
    dbName,
  );
}

export async function findCourse(courseId: number): Promise<Course | undefined> {
  return getQuery<Course>(
    'SELECT id, dance_group_id FROM dance_courses WHERE id = ?',
    [courseId],
    dbName,
  );
}

export async function findLearnedChoreographies(
  groupId: number,
  today: string,
): Promise<ChoreographyId[]> {
  return allQuery<ChoreographyId>(
    `SELECT choreography_id FROM learned_choreographies
     WHERE dance_group_id = ? AND first_learned_date < ?`,
    [groupId, today],
    dbName,
  );
}

export async function findPriorSessionChoreographies(
  groupId: number,
  date: string,
): Promise<ChoreographyId[]> {
  return allQuery<ChoreographyId>(
    `SELECT DISTINCT sc.choreography_id
     FROM sessions s
     INNER JOIN session_choreographies sc ON s.id = sc.session_id
     INNER JOIN dance_courses dc ON s.dance_course_id = dc.id
     WHERE dc.dance_group_id = ? AND s.session_date < ?`,
    [groupId, date],
    dbName,
  );
}

export async function findBaseFigures(groupId: number): Promise<{ step_figure_id: number }[]> {
  return allQuery<{ step_figure_id: number }>(
    'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ?',
    [groupId],
    dbName,
  );
}

export async function findChoreographyFigures(
  choreographyIds: number[],
): Promise<{ id: number }[]> {
  if (choreographyIds.length === 0) return [];
  return allQuery<{ id: number }>(
    `SELECT DISTINCT csf.step_figure_id AS id
     FROM choreography_step_figures csf
     WHERE csf.choreography_id IN (${choreographyIds.map(() => '?').join(',')})`,
    choreographyIds,
  );
}

export async function findExpandedFigures(ids: number[]): Promise<{ name: string }[]> {
  if (ids.length === 0) return [];
  return allQuery<{ name: string }>(
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

export async function findSuggestions(
  namesLower: string[],
  maxLevelValue: number | null,
): Promise<Suggestion[]> {
  const knownFiguresCte =
    namesLower.length === 0
      ? 'SELECT NULL AS name_lower WHERE 1=0'
      : namesLower.map(() => 'SELECT ? AS name_lower').join('\n       UNION\n       ');
  const levelCondition = maxLevelValue === null ? '' : 'AND (l.value IS NOT NULL AND l.value <= ?)';
  const params = maxLevelValue === null ? namesLower : [...namesLower, maxLevelValue];
  return allQuery<Suggestion>(
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
