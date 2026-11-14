import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { GroupId, GroupName } from './validation.ts';
import type { Figure } from '../step-figures/operations.ts';

export type Group = {
  id: number;
  name: string;
  max_group_level_value: number | null;
  created_at: string | null;
};
type DatabaseId = GroupId | number;

const dbName = 'danceGroups' as const;
const groupColumns = 'id, name, max_group_level_value, created_at';

export async function withGroupTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction(dbName, action);
}

export async function listGroups(): Promise<Group[]> {
  return allQuery<Group>(`SELECT ${groupColumns} FROM dance_groups ORDER BY name ASC`, [], dbName);
}

export async function findGroup(id: DatabaseId): Promise<Group | undefined> {
  return getQuery<Group>(`SELECT ${groupColumns} FROM dance_groups WHERE id = ?`, [id], dbName);
}

function isDuplicateName(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes('UNIQUE constraint failed: dance_groups.name')
  );
}

export async function insertGroup(
  name: GroupName,
): Promise<{ id: number } | { error: 'duplicate_name' }> {
  try {
    const result = await runQuery('INSERT INTO dance_groups (name) VALUES (?)', [name], dbName);
    return { id: result.id };
  } catch (error) {
    if (isDuplicateName(error)) return { error: 'duplicate_name' };
    throw error;
  }
}

export async function renameGroup(
  id: GroupId,
  name: GroupName,
): Promise<{ value: true } | { error: 'duplicate_name' }> {
  try {
    await runQuery('UPDATE dance_groups SET name = ? WHERE id = ?', [name, id], dbName);
    return { value: true };
  } catch (error) {
    if (isDuplicateName(error)) return { error: 'duplicate_name' };
    throw error;
  }
}

export async function setMaxLevel(id: number, value: number | null): Promise<WriteResult> {
  return runQuery(
    'UPDATE dance_groups SET max_group_level_value = ? WHERE id = ?',
    [value, id],
    dbName,
  );
}

export async function deleteGroup(id: GroupId): Promise<boolean> {
  const result = await runQuery('DELETE FROM dance_groups WHERE id = ?', [id], dbName);
  return result.changes > 0;
}

export async function findFiguresByNames(names: string[]): Promise<Pick<Figure, 'id'>[]> {
  return allQuery<Pick<Figure, 'id'>>(
    `SELECT id FROM step_figures WHERE LOWER(name) IN (${names.map(() => '?').join(',')})`,
    names.map((name) => name.toLowerCase()),
  );
}

export async function insertBaseFigures(groupId: number, figureIds: number[]): Promise<void> {
  if (figureIds.length === 0) return;
  await runQuery(
    `INSERT OR IGNORE INTO group_base_step_figures (dance_group_id, step_figure_id) VALUES ${figureIds.map(() => '(?, ?)').join(',')}`,
    figureIds.flatMap((id) => [groupId, id]),
    dbName,
  );
}

export async function deleteBaseFigures(groupId: number): Promise<WriteResult> {
  return runQuery(
    'DELETE FROM group_base_step_figures WHERE dance_group_id = ?',
    [groupId],
    dbName,
  );
}

export async function findBaseFigureIds(groupId: number): Promise<number[]> {
  const rows = await allQuery<{ step_figure_id: number }>(
    'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ? ORDER BY step_figure_id ASC',
    [groupId],
    dbName,
  );
  return rows.map((row) => row.step_figure_id);
}

export async function findFigures(ids: number[]): Promise<Figure[]> {
  if (ids.length === 0) return [];
  return allQuery<Figure>(
    `SELECT id, name FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name ASC`,
    ids,
  );
}
