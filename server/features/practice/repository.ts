import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import { effectiveLevelValue, personalLevelJoins } from '../choreographies/level-sql.ts';
import type { PracticeConfidence, PracticeRow } from './operations.ts';

export type PracticeLogEntry = {
  id: number;
  choreography_id: number;
  choreography_name: string;
  practiced_on: string;
  confidence: PracticeConfidence;
  note: string | null;
  song_id: number | null;
  song_title: string | null;
};

export type NewPracticeEntry = {
  choreographyId: number;
  practicedOn: string;
  confidence: PracticeConfidence;
  songId: number | null;
  note: string | null;
};

export async function withPracticeTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function findExistingChoreographyIds(ids: number[]): Promise<number[]> {
  const rows = await allQuery<{ id: number }>(
    `SELECT id FROM choreographies WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
  return rows.map((row) => row.id);
}

export async function songBelongsToChoreography(
  choreographyId: number,
  songId: number,
): Promise<boolean> {
  const row = await getQuery<{ id: number }>(
    'SELECT id FROM choreography_songs WHERE choreography_id = ? AND id = ?',
    [choreographyId, songId],
  );
  return row !== undefined;
}

export async function insertEntry(entry: NewPracticeEntry): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO personal_data.choreography_practice_log
       (choreography_id, practiced_on, confidence, song_id, note)
     VALUES (?, ?, ?, ?, ?)`,
    [entry.choreographyId, entry.practicedOn, entry.confidence, entry.songId, entry.note],
  );
}

export async function listEntries(limit: number): Promise<PracticeLogEntry[]> {
  return allQuery<PracticeLogEntry>(
    `SELECT l.id, l.choreography_id, c.name AS choreography_name, l.practiced_on, l.confidence,
            l.note, l.song_id, s.title AS song_title
     FROM personal_data.choreography_practice_log l
     JOIN choreographies c ON c.id = l.choreography_id
     LEFT JOIN choreography_songs s ON s.id = l.song_id
     ORDER BY l.practiced_on DESC, l.id DESC
     LIMIT ?`,
    [limit],
  );
}

export async function deleteEntry(id: number): Promise<WriteResult> {
  return runQuery('DELETE FROM personal_data.choreography_practice_log WHERE id = ?', [id]);
}

/** Every learned dance, once per practice entry (or once with null entry columns). */
export async function listLearnedPracticeRows(): Promise<PracticeRow[]> {
  return allQuery<PracticeRow>(
    `SELECT ls.choreography_id, pl.id AS entry_id, pl.practiced_on, pl.confidence, pl.note,
            COALESCE(${effectiveLevelValue}, 0) AS level_value
     FROM personal_data.choreography_learning_status ls
     JOIN choreographies c ON c.id = ls.choreography_id
     LEFT JOIN levels l ON l.id = c.level_id
     ${personalLevelJoins}
     LEFT JOIN personal_data.choreography_practice_log pl ON pl.choreography_id = ls.choreography_id
     WHERE ls.status = 'learned'`,
  );
}

export async function deleteOrphanedEntries(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM personal_data.choreography_practice_log
     WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
}
