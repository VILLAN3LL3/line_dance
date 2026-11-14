import { getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';

export async function withRatingTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function findChoreography(id: number): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM choreographies WHERE id = ?', [id]);
}

export async function saveRating(id: number, rating: number): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO personal_data.choreography_ratings (choreography_id, rating)
     VALUES (?, ?)
     ON CONFLICT(choreography_id) DO UPDATE SET rating = excluded.rating`,
    [id, rating],
  );
}

export async function deleteRating(id: number): Promise<WriteResult> {
  return runQuery('DELETE FROM personal_data.choreography_ratings WHERE choreography_id = ?', [id]);
}
