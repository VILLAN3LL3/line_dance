import { allQuery, runQuery, withTransaction } from '../scripts/db.js';
import { clearAutomaticRepetitions, distributeRepetitions } from './session-repetitions.js';

const dbName = 'danceGroups';

async function moveContents(sessions, targets) {
  const sessionIds = sessions.map((session) => session.id);
  const placeholders = sessionIds.map(() => '?').join(',');
  await clearAutomaticRepetitions(sessions[0].dance_course_id);
  const choreographies = await allQuery(
    `SELECT * FROM session_choreographies WHERE session_id IN (${placeholders})`,
    sessionIds,
    dbName,
  );
  await runQuery(
    `DELETE FROM session_choreographies WHERE session_id IN (${placeholders})`,
    sessionIds,
    dbName,
  );
  await runQuery(
    `UPDATE sessions SET comment = CASE id ${sessionIds.map(() => 'WHEN ? THEN ?').join(' ')} END WHERE id IN (${placeholders})`,
    [...sessions.flatMap((session) => [targets.get(session.id), session.comment]), ...sessionIds],
    dbName,
  );
  if (choreographies.length > 0) {
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
  await distributeRepetitions(sessions[0].dance_course_id);
}

export async function rearrangeSessionContents(sessionIds, mode) {
  return withTransaction(dbName, async () => {
    const placeholders = sessionIds.map(() => '?').join(',');
    const sessions = await allQuery(
      `SELECT id, dance_course_id, comment FROM sessions WHERE id IN (${placeholders}) ORDER BY session_date, id`,
      sessionIds,
      dbName,
    );
    if (sessions.length !== sessionIds.length) return 'not_found';
    if (sessions.some((session) => session.dance_course_id !== sessions[0].dance_course_id)) {
      return 'different_course';
    }

    const targets =
      mode === 'swap'
        ? new Map([
            [sessionIds[0], sessionIds[1]],
            [sessionIds[1], sessionIds[0]],
          ])
        : new Map(sessionIds.map((sourceId, index) => [sourceId, sessions[index].id]));
    await moveContents(sessions, targets);
    return 'ok';
  });
}
