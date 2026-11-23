import { allQuery, runQuery } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { RearrangementSession } from './operations.ts';

export type SessionContent = RearrangementSession & { comment: string | null };
export type SessionChoreography = {
  id: number;
  session_id: number;
  choreography_id: number;
  created_at: string | null;
  is_new: number;
  repeat_source_id: number | null;
  auto_repeat: number;
  song_id: number | null;
};

const dbName = 'danceGroups' as const;

export async function getSessionsForRearrangement(sessionIds: number[]): Promise<SessionContent[]> {
  const placeholders = sessionIds.map(() => '?').join(',');
  return allQuery<SessionContent>(
    `SELECT id, dance_course_id, comment FROM sessions WHERE id IN (${placeholders}) ORDER BY session_date, id`,
    sessionIds,
    dbName,
  );
}

export async function listSessionChoreographies(
  sessionIds: number[],
): Promise<SessionChoreography[]> {
  const placeholders = sessionIds.map(() => '?').join(',');
  return allQuery<SessionChoreography>(
    `SELECT * FROM session_choreographies WHERE session_id IN (${placeholders})`,
    sessionIds,
    dbName,
  );
}

export async function deleteSessionChoreographies(sessionIds: number[]): Promise<WriteResult> {
  const placeholders = sessionIds.map(() => '?').join(',');
  return runQuery(
    `DELETE FROM session_choreographies WHERE session_id IN (${placeholders})`,
    sessionIds,
    dbName,
  );
}

export async function moveSessionComments(
  sessions: SessionContent[],
  targets: Map<number, number>,
): Promise<void> {
  const sessionIds = sessions.map((session) => session.id);
  const placeholders = sessionIds.map(() => '?').join(',');
  await runQuery(
    `UPDATE sessions SET comment = CASE id ${sessionIds.map(() => 'WHEN ? THEN ?').join(' ')} END WHERE id IN (${placeholders})`,
    [...sessions.flatMap((session) => [targets.get(session.id), session.comment]), ...sessionIds],
    dbName,
  );
}

export async function restoreSessionChoreographies(
  choreographies: SessionChoreography[],
  targets: Map<number, number>,
): Promise<void> {
  if (choreographies.length === 0) return;
  await runQuery(
    `INSERT INTO session_choreographies (id, session_id, choreography_id, created_at, is_new, repeat_source_id, auto_repeat, song_id) VALUES ${choreographies.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',')}`,
    choreographies.flatMap((choreography) => [
      choreography.id,
      targets.get(choreography.session_id),
      choreography.choreography_id,
      choreography.created_at,
      choreography.is_new,
      choreography.repeat_source_id,
      choreography.auto_repeat,
      choreography.song_id,
    ]),
    dbName,
  );
}
