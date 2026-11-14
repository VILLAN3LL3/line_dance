import { runQuery } from '../../scripts/db.js';

const dbName = 'danceGroups';

export async function clearAutomaticRepetitions(courseId) {
  await runQuery(
    `DELETE FROM session_choreographies WHERE repeat_source_id IS NOT NULL
     AND session_id IN (SELECT id FROM sessions WHERE dance_course_id = ?)`,
    [courseId],
    dbName,
  );
}

export async function distributeRepetitions(courseId, sourceId = null) {
  await runQuery(
    `WITH ordered_sessions AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY session_date, id) AS position
       FROM sessions WHERE dance_course_id = ?
     )
     INSERT OR IGNORE INTO session_choreographies
       (session_id, choreography_id, is_new, repeat_source_id, auto_repeat)
     SELECT target.id, source.choreography_id, 0, source.id, 0
     FROM session_choreographies source
     JOIN ordered_sessions origin ON origin.id = source.session_id
     JOIN ordered_sessions target ON target.position BETWEEN origin.position + 1 AND origin.position + 2
     WHERE source.auto_repeat = 1 AND source.repeat_source_id IS NULL
       AND (? IS NULL OR source.id = ?)
     ORDER BY origin.position DESC, source.id`,
    [courseId, sourceId, sourceId],
    dbName,
  );
}
