import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';

export interface ConfigurationRow {
  id: number;
  name: string;
  filters_json: string;
  created_at: string;
  updated_at: string;
}

export type DuplicateNameError = { error: 'duplicate_name' };

let tableReady = false;
const columns = 'id, name, filters_json, created_at, updated_at';

export async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await runQuery(`
    CREATE TABLE IF NOT EXISTS personal_data.saved_filter_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      filters_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tableReady = true;
}

export async function withFilterTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function listConfigurations(): Promise<ConfigurationRow[]> {
  return allQuery<ConfigurationRow>(
    `SELECT ${columns} FROM personal_data.saved_filter_configurations ORDER BY LOWER(name) ASC`,
  );
}

export async function findConfiguration(id: number): Promise<ConfigurationRow | undefined> {
  return getQuery<ConfigurationRow>(
    `SELECT ${columns} FROM personal_data.saved_filter_configurations WHERE id = ?`,
    [id],
  );
}

export async function findConfigurationByName(name: string): Promise<ConfigurationRow | undefined> {
  return getQuery<ConfigurationRow>(
    `SELECT ${columns} FROM personal_data.saved_filter_configurations WHERE name = ?`,
    [name],
  );
}

export async function upsertConfiguration(name: string, filtersJson: string): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO personal_data.saved_filter_configurations (name, filters_json)
     VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET
       filters_json = excluded.filters_json, updated_at = CURRENT_TIMESTAMP`,
    [name, filtersJson],
  );
}

export async function updateConfiguration(
  id: number,
  name: string,
  filtersJson: string,
): Promise<DuplicateNameError | { error?: never }> {
  try {
    await runQuery(
      `UPDATE personal_data.saved_filter_configurations
       SET name = ?, filters_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, filtersJson, id],
    );
    return {};
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'SQLITE_CONSTRAINT' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('UNIQUE constraint failed: saved_filter_configurations.name')
    ) {
      return { error: 'duplicate_name' };
    }
    throw error;
  }
}

export async function deleteConfiguration(id: number): Promise<boolean> {
  const result = await runQuery(
    'DELETE FROM personal_data.saved_filter_configurations WHERE id = ?',
    [id],
  );
  return result.changes > 0;
}
