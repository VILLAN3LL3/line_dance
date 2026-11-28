import { getQuery, allQuery } from '../../scripts/db.ts';
import type { SuggestionMusicFilter, prepareLearnedGroupId } from './operations.ts';
import { effectiveLevelValue, personalLevelJoins } from '../choreographies/level-sql.ts';

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
  music: SuggestionMusicFilter,
): Promise<{ choreography_id: number; missing_figure: string }[]> {
  const knownFiguresCte =
    namesLower.length === 0
      ? 'SELECT NULL AS name_lower WHERE 1=0'
      : namesLower.map(() => 'SELECT ? AS name_lower').join('\n       UNION\n       ');
  const levelCondition =
    maxLevelValue === null
      ? ''
      : `AND (${effectiveLevelValue} IS NOT NULL AND ${effectiveLevelValue} <= ?)`;
  const musicParts: string[] = [];
  const musicParams: (string | number)[] = [];
  if (music.minBpm !== null) {
    musicParts.push('music.bpm >= ?');
    musicParams.push(music.minBpm);
  }
  if (music.maxBpm !== null) {
    musicParts.push('music.bpm <= ?');
    musicParams.push(music.maxBpm);
  }
  if (music.genres.length > 0) {
    musicParts.push(
      `music.genre_id IN (SELECT id FROM genres WHERE LOWER(name) IN (${music.genres.map(() => 'LOWER(?)').join(',')}))`,
    );
    musicParams.push(...music.genres);
  }
  const musicCondition =
    musicParts.length === 0
      ? ''
      : `AND EXISTS (
           SELECT 1 FROM choreography_songs music
           WHERE music.choreography_id = c.id AND ${musicParts.join(' AND ')}
         )`;
  const levelParams = maxLevelValue === null ? [] : [maxLevelValue];
  const innerParams = [...levelParams, ...musicParams];
  return allQuery<{ choreography_id: number; missing_figure: string }>(
    `WITH known_figures AS (
       ${knownFiguresCte}
     ),
     eligible_choreographies AS (
       SELECT c.id
       FROM choreographies c
       INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
       INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
       LEFT JOIN levels l ON c.level_id = l.id
       ${personalLevelJoins}
       WHERE 1=1 ${levelCondition} ${musicCondition}
       GROUP BY c.id
       HAVING COUNT(DISTINCT CASE WHEN LOWER(sf.name) NOT IN (SELECT name_lower FROM known_figures)
                  THEN LOWER(sf.name) END) BETWEEN 1 AND 2
     )
     SELECT c.id AS choreography_id, sf.name AS missing_figure
     FROM choreographies c
     INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
     INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
     LEFT JOIN levels l ON c.level_id = l.id
     ${personalLevelJoins}
     INNER JOIN eligible_choreographies ec ON ec.id = c.id
     WHERE 1=1 ${levelCondition} ${musicCondition}
       AND LOWER(sf.name) NOT IN (SELECT name_lower FROM known_figures)
     ORDER BY c.id, LOWER(sf.name)`,
    [...namesLower, ...innerParams, ...levelParams, ...musicParams],
  );
}
