import { getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';

export async function withPersonalLevelTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function findChoreography(id: number): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM choreographies WHERE id = ?', [id]);
}

export async function findLevel(name: string): Promise<{ id: number; name: string } | undefined> {
  return getQuery<{ id: number; name: string }>(
    'SELECT id, name FROM levels WHERE UPPER(name) = UPPER(?)',
    [name],
  );
}

export async function savePersonalLevel(id: number, levelId: number): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO personal_data.choreography_personal_levels (choreography_id, level_id)
     VALUES (?, ?)
     ON CONFLICT(choreography_id) DO UPDATE SET level_id = excluded.level_id`,
    [id, levelId],
  );
}

export async function deletePersonalLevel(id: number): Promise<WriteResult> {
  return runQuery(
    'DELETE FROM personal_data.choreography_personal_levels WHERE choreography_id = ?',
    [id],
  );
}
