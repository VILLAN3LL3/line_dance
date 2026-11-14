import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';

let tableReady = false;
const columns = 'id, name, filters_json, created_at, updated_at';

export async function ensureTable() {
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

export function withFilterTransaction(action) {
  return withTransaction('choreography', action);
}

export function listConfigurations() {
  return allQuery(
    `SELECT ${columns} FROM personal_data.saved_filter_configurations ORDER BY LOWER(name) ASC`,
  );
}

export function findConfiguration(id) {
  return getQuery(`SELECT ${columns} FROM personal_data.saved_filter_configurations WHERE id = ?`, [
    id,
  ]);
}

export function findConfigurationByName(name) {
  return getQuery(
    `SELECT ${columns} FROM personal_data.saved_filter_configurations WHERE name = ?`,
    [name],
  );
}

export function upsertConfiguration(name, filtersJson) {
  return runQuery(
    `INSERT INTO personal_data.saved_filter_configurations (name, filters_json)
     VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET
       filters_json = excluded.filters_json, updated_at = CURRENT_TIMESTAMP`,
    [name, filtersJson],
  );
}

export async function updateConfiguration(id, name, filtersJson) {
  try {
    await runQuery(
      `UPDATE personal_data.saved_filter_configurations
       SET name = ?, filters_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, filtersJson, id],
    );
    return {};
  } catch (error) {
    if (
      error?.code === 'SQLITE_CONSTRAINT' &&
      error.message?.includes('UNIQUE constraint failed: saved_filter_configurations.name')
    ) {
      return { error: 'duplicate_name' };
    }
    throw error;
  }
}

export async function deleteConfiguration(id) {
  const result = await runQuery(
    'DELETE FROM personal_data.saved_filter_configurations WHERE id = ?',
    [id],
  );
  return result.changes > 0;
}
