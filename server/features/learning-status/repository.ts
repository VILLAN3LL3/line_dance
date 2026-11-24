import { getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { LearningStatus } from './operations.ts';

export type StoredLearningStatus = { status: LearningStatus; status_date: string | null };

export async function withLearningStatusTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function findChoreography(id: number | string): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM choreographies WHERE id = ?', [id]);
}

export async function findStatus(id: number | string): Promise<StoredLearningStatus | undefined> {
  return getQuery<StoredLearningStatus>(
    `SELECT status, status_date FROM personal_data.choreography_learning_status
     WHERE choreography_id = ?`,
    [id],
  );
}

/** The date only changes together with the status, so saving the same status again keeps it. */
export async function saveStatus(
  id: number | string,
  status: LearningStatus,
): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO personal_data.choreography_learning_status (choreography_id, status, status_date)
     VALUES (?, ?, date('now', 'localtime'))
     ON CONFLICT(choreography_id) DO UPDATE SET
       status = excluded.status,
       status_date = CASE
         WHEN choreography_learning_status.status = excluded.status
           THEN choreography_learning_status.status_date
         ELSE excluded.status_date
       END`,
    [id, status],
  );
}

export async function deleteStatus(id: number | string): Promise<WriteResult> {
  return runQuery(
    'DELETE FROM personal_data.choreography_learning_status WHERE choreography_id = ?',
    [id],
  );
}

export async function deleteOrphanedStatuses(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM personal_data.choreography_learning_status
     WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
}
