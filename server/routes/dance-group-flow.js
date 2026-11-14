import { allQuery, getQuery, runQuery, withTransaction } from '../scripts/db.js';

const dbName = 'danceGroups';
const defaultBaseStepFigureNames = ['Hip Bump', 'Hip Sway', 'Kick', 'Run'];

async function insertBaseFigures(groupId, figureIds) {
  if (figureIds.length === 0) return;
  await runQuery(
    `INSERT OR IGNORE INTO group_base_step_figures (dance_group_id, step_figure_id) VALUES ${figureIds.map(() => '(?, ?)').join(',')}`,
    figureIds.flatMap((id) => [groupId, id]),
    dbName,
  );
}

export async function createGroupWithDefaults(name) {
  const figures = await allQuery(
    `SELECT id FROM step_figures WHERE LOWER(name) IN (${defaultBaseStepFigureNames.map(() => '?').join(',')})`,
    defaultBaseStepFigureNames.map((figureName) => figureName.toLowerCase()),
  );
  return withTransaction(dbName, async () => {
    const result = await runQuery('INSERT INTO dance_groups (name) VALUES (?)', [name], dbName);
    await insertBaseFigures(
      result.id,
      figures.map((figure) => figure.id),
    );
    return getQuery(
      'SELECT id, name, max_group_level_value, created_at FROM dance_groups WHERE id = ?',
      [result.id],
      dbName,
    );
  });
}

export async function replaceBaseFigures(groupId, figureIds) {
  return withTransaction(dbName, async () => {
    const group = await getQuery('SELECT id FROM dance_groups WHERE id = ?', [groupId], dbName);
    if (!group) return null;

    await runQuery(
      'DELETE FROM group_base_step_figures WHERE dance_group_id = ?',
      [groupId],
      dbName,
    );
    await insertBaseFigures(groupId, figureIds);
    const rows = await allQuery(
      'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ? ORDER BY step_figure_id ASC',
      [groupId],
      dbName,
    );
    return rows.map((row) => row.step_figure_id);
  });
}
