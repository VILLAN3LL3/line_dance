import { getQuery, runQuery, withTransaction } from '../../scripts/db.js';

export function withRatingTransaction(action) {
  return withTransaction('choreography', action);
}

export function findChoreography(id) {
  return getQuery('SELECT id FROM choreographies WHERE id = ?', [id]);
}

export function saveRating(id, rating) {
  return runQuery(
    `INSERT INTO personal_data.choreography_ratings (choreography_id, rating)
     VALUES (?, ?)
     ON CONFLICT(choreography_id) DO UPDATE SET rating = excluded.rating`,
    [id, rating],
  );
}

export function deleteRating(id) {
  return runQuery('DELETE FROM personal_data.choreography_ratings WHERE choreography_id = ?', [id]);
}
