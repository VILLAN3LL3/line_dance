import { allQuery, runQuery } from '../../scripts/db.js';

const dbName = 'danceGroups';

export async function getSessionsForRearrangement(sessionIds) {
  const placeholders = sessionIds.map(() => '?').join(',');
  return allQuery(
    `SELECT id, dance_course_id, comment FROM sessions WHERE id IN (${placeholders}) ORDER BY session_date, id`,
    sessionIds,
    dbName,
  );
}

export function listSessionChoreographies(sessionIds) {
  const placeholders = sessionIds.map(() => '?').join(',');
  return allQuery(
    `SELECT * FROM session_choreographies WHERE session_id IN (${placeholders})`,
    sessionIds,
    dbName,
  );
}

export function deleteSessionChoreographies(sessionIds) {
  const placeholders = sessionIds.map(() => '?').join(',');
  return runQuery(
    `DELETE FROM session_choreographies WHERE session_id IN (${placeholders})`,
    sessionIds,
    dbName,
  );
}

export async function moveSessionComments(sessions, targets) {
  const sessionIds = sessions.map((session) => session.id);
  const placeholders = sessionIds.map(() => '?').join(',');
  await runQuery(
    `UPDATE sessions SET comment = CASE id ${sessionIds.map(() => 'WHEN ? THEN ?').join(' ')} END WHERE id IN (${placeholders})`,
    [...sessions.flatMap((session) => [targets.get(session.id), session.comment]), ...sessionIds],
    dbName,
  );
}

export async function restoreSessionChoreographies(choreographies, targets) {
  if (choreographies.length === 0) return;
  await runQuery(
    `INSERT INTO session_choreographies (id, session_id, choreography_id, created_at, is_new, repeat_source_id, auto_repeat) VALUES ${choreographies.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',')}`,
    choreographies.flatMap((choreography) => [
      choreography.id,
      targets.get(choreography.session_id),
      choreography.choreography_id,
      choreography.created_at,
      choreography.is_new,
      choreography.repeat_source_id,
      choreography.auto_repeat,
    ]),
    dbName,
  );
}
