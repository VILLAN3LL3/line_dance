import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';

export function withFigureTransaction(action) {
  return withTransaction('choreography', action);
}

export function listFigureNames() {
  return allQuery('SELECT name FROM step_figures ORDER BY name');
}

export function listFigures() {
  return allQuery('SELECT id, name FROM step_figures ORDER BY name');
}

export function listFigureUsage() {
  return allQuery(
    `SELECT sf.id, sf.name,
            COALESCE(usage_counts.used_by_choreography_count, 0) AS used_by_choreography_count
     FROM step_figures sf
     LEFT JOIN (
       SELECT step_figure_id, COUNT(*) AS used_by_choreography_count
       FROM choreography_step_figures GROUP BY step_figure_id
     ) usage_counts ON usage_counts.step_figure_id = sf.id
     ORDER BY LOWER(sf.name) ASC, sf.id ASC`,
  );
}

export function listFigureRelations() {
  return allQuery(
    `SELECT sfc.parent_step_figure_id, sfc.child_step_figure_id, sfc.sort_order,
            parent.name AS parent_name, child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY sfc.sort_order ASC, LOWER(child.name) ASC, child.id ASC`,
  );
}

export function findFigure(id) {
  return getQuery('SELECT id, name FROM step_figures WHERE id = ?', [id]);
}

export function findFigures(ids) {
  if (ids.length === 0) return Promise.resolve([]);
  return allQuery(`SELECT id FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

export function findDuplicate(name, excludeId = null) {
  if (excludeId === null) {
    return getQuery('SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?)', [name]);
  }
  return getQuery('SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?) AND id != ?', [
    name,
    excludeId,
  ]);
}

export function findCycle(componentId, parentId) {
  return getQuery(
    `WITH RECURSIVE descendants(id) AS (
       SELECT child_step_figure_id FROM step_figure_components WHERE parent_step_figure_id = ?
       UNION
       SELECT sfc.child_step_figure_id FROM step_figure_components sfc
       INNER JOIN descendants ON descendants.id = sfc.parent_step_figure_id
     )
     SELECT 1 AS has_cycle FROM descendants WHERE id = ? LIMIT 1`,
    [componentId, parentId],
  );
}

export async function insertFigure(name) {
  try {
    const result = await runQuery('INSERT INTO step_figures (name) VALUES (?)', [name]);
    return { id: result.id };
  } catch (error) {
    if (
      error?.code === 'SQLITE_CONSTRAINT' &&
      error.message?.includes('UNIQUE constraint failed: step_figures.name')
    ) {
      return { error: 'duplicate' };
    }
    throw error;
  }
}

export function renameFigure(id, name) {
  return runQuery('UPDATE step_figures SET name = ? WHERE id = ?', [name, id]);
}

export function deleteComponents(parentId) {
  return runQuery('DELETE FROM step_figure_components WHERE parent_step_figure_id = ?', [parentId]);
}

export function insertComponent(parentId, childId, position) {
  return runQuery(
    'INSERT INTO step_figure_components (parent_step_figure_id, child_step_figure_id, sort_order) VALUES (?, ?, ?)',
    [parentId, childId, position],
  );
}

export function findUsage(id) {
  return getQuery(
    `SELECT
       (SELECT COUNT(*) FROM choreography_step_figures WHERE step_figure_id = ?) AS choreography_usage_count,
       (SELECT COUNT(*) FROM step_figure_components WHERE parent_step_figure_id = ?) AS component_count,
       (SELECT COUNT(*) FROM step_figure_components WHERE child_step_figure_id = ?) AS parent_count`,
    [id, id, id],
  );
}

export function deleteParentReferences(id) {
  return runQuery('DELETE FROM step_figure_components WHERE child_step_figure_id = ?', [id]);
}

export function deleteFigure(id) {
  return runQuery('DELETE FROM step_figures WHERE id = ?', [id]);
}
