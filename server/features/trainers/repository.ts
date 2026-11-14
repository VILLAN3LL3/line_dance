import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { TrainerDetails } from './validation.ts';

const dbName = 'danceGroups';

export interface Trainer extends TrainerDetails {
  id: number;
  created_at: string;
}
export type DuplicateEmailError = { error: 'duplicate_email' };

export async function withTrainerTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction(dbName, action);
}

export async function listTrainers(): Promise<Trainer[]> {
  return allQuery<Trainer>(
    'SELECT id, name, phone, email, created_at FROM trainers ORDER BY LOWER(name) ASC',
    [],
    dbName,
  );
}

export async function findTrainer(id: number | string): Promise<Trainer | undefined> {
  return getQuery<Trainer>(
    'SELECT id, name, phone, email, created_at FROM trainers WHERE id = ?',
    [id],
    dbName,
  );
}

function isDuplicateEmail(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes('UNIQUE constraint failed: trainers.email')
  );
}

export async function insertTrainer({
  name,
  phone,
  email,
}: TrainerDetails): Promise<{ id: number } | DuplicateEmailError> {
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

export async function saveTrainer(
  id: number | string,
  { name, phone, email }: TrainerDetails,
): Promise<{ error?: never } | DuplicateEmailError> {
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

export async function clearCourseTrainer(id: number | string): Promise<WriteResult> {
  return runQuery('UPDATE dance_courses SET trainer_id = NULL WHERE trainer_id = ?', [id], dbName);
}

export async function deleteTrainer(id: number | string): Promise<boolean> {
  const result = await runQuery('DELETE FROM trainers WHERE id = ?', [id], dbName);
  return result.changes > 0;
}
