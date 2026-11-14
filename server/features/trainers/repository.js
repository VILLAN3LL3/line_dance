import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.js';

const dbName = 'danceGroups';

export function withTrainerTransaction(action) {
  return withTransaction(dbName, action);
}

export function listTrainers() {
  return allQuery(
    'SELECT id, name, phone, email, created_at FROM trainers ORDER BY LOWER(name) ASC',
    [],
    dbName,
  );
}

export function findTrainer(id) {
  return getQuery(
    'SELECT id, name, phone, email, created_at FROM trainers WHERE id = ?',
    [id],
    dbName,
  );
}

function isDuplicateEmail(error) {
  return (
    error?.code === 'SQLITE_CONSTRAINT' &&
    error.message?.includes('UNIQUE constraint failed: trainers.email')
  );
}

export async function insertTrainer({ name, phone, email }) {
  try {
    const result = await runQuery(
      'INSERT INTO trainers (name, phone, email) VALUES (?, ?, ?)',
      [name, phone, email],
      dbName,
    );
    return { id: result.id };
  } catch (error) {
    if (isDuplicateEmail(error)) return { error: 'duplicate_email' };
    throw error;
  }
}

export async function saveTrainer(id, { name, phone, email }) {
  try {
    await runQuery(
      'UPDATE trainers SET name = ?, phone = ?, email = ? WHERE id = ?',
      [name, phone, email, id],
      dbName,
    );
    return {};
  } catch (error) {
    if (isDuplicateEmail(error)) return { error: 'duplicate_email' };
    throw error;
  }
}

export function clearCourseTrainer(id) {
  return runQuery('UPDATE dance_courses SET trainer_id = NULL WHERE trainer_id = ?', [id], dbName);
}

export async function deleteTrainer(id) {
  const result = await runQuery('DELETE FROM trainers WHERE id = ?', [id], dbName);
  return result.changes > 0;
}
