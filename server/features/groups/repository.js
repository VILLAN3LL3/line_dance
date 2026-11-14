import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.js';

const dbName = 'danceGroups';
const groupColumns = 'id, name, max_group_level_value, created_at';

export function withGroupTransaction(action) {
  return withTransaction(dbName, action);
}

export function listGroups() {
  return allQuery(`SELECT ${groupColumns} FROM dance_groups ORDER BY name ASC`, [], dbName);
}

export function findGroup(id) {
  return getQuery(`SELECT ${groupColumns} FROM dance_groups WHERE id = ?`, [id], dbName);
}

function isDuplicateName(error) {
  return (
    error?.code === 'SQLITE_CONSTRAINT' &&
    error.message?.includes('UNIQUE constraint failed: dance_groups.name')
  );
}

export async function insertGroup(name) {
  try {
    const result = await runQuery('INSERT INTO dance_groups (name) VALUES (?)', [name], dbName);
    return { id: result.id };
  } catch (error) {
    if (isDuplicateName(error)) return { error: 'duplicate_name' };
    throw error;
  }
}

export async function renameGroup(id, name) {
  try {
    await runQuery('UPDATE dance_groups SET name = ? WHERE id = ?', [name, id], dbName);
    return {};
  } catch (error) {
    if (isDuplicateName(error)) return { error: 'duplicate_name' };
    throw error;
  }
}

export function setMaxLevel(id, value) {
  return runQuery(
    'UPDATE dance_groups SET max_group_level_value = ? WHERE id = ?',
    [value, id],
    dbName,
  );
}

export async function deleteGroup(id) {
  const result = await runQuery('DELETE FROM dance_groups WHERE id = ?', [id], dbName);
  return result.changes > 0;
}

export function findFiguresByNames(names) {
  return allQuery(
    `SELECT id FROM step_figures WHERE LOWER(name) IN (${names.map(() => '?').join(',')})`,
    names.map((name) => name.toLowerCase()),
  );
}

export async function insertBaseFigures(groupId, figureIds) {
  if (figureIds.length === 0) return;
  await runQuery(
    `INSERT OR IGNORE INTO group_base_step_figures (dance_group_id, step_figure_id) VALUES ${figureIds.map(() => '(?, ?)').join(',')}`,
    figureIds.flatMap((id) => [groupId, id]),
    dbName,
  );
}

export function deleteBaseFigures(groupId) {
  return runQuery(
    'DELETE FROM group_base_step_figures WHERE dance_group_id = ?',
    [groupId],
    dbName,
  );
}

export async function findBaseFigureIds(groupId) {
  const rows = await allQuery(
    'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ? ORDER BY step_figure_id ASC',
    [groupId],
    dbName,
  );
  return rows.map((row) => row.step_figure_id);
}

export function findFigures(ids) {
  if (ids.length === 0) return Promise.resolve([]);
  return allQuery(
    `SELECT id, name FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name ASC`,
    ids,
  );
}
