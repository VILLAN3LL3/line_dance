import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { Figure, FigureCounts, FigureRelation, FigureUsage } from './operations.ts';

export async function withFigureTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function listFigureNames(): Promise<Pick<Figure, 'name'>[]> {
  return allQuery<Pick<Figure, 'name'>>('SELECT name FROM step_figures ORDER BY name');
}

export async function listFigures(): Promise<Figure[]> {
  return allQuery<Figure>('SELECT id, name FROM step_figures ORDER BY name');
}

export async function listFigureUsage(): Promise<FigureUsage[]> {
  return allQuery<FigureUsage>(
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

export async function listFigureRelations(): Promise<FigureRelation[]> {
  return allQuery<FigureRelation>(
    `SELECT sfc.parent_step_figure_id, sfc.child_step_figure_id, sfc.sort_order,
            parent.name AS parent_name, child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY sfc.sort_order ASC, LOWER(child.name) ASC, child.id ASC`,
  );
}

export async function findFigure(id: number): Promise<Figure | undefined> {
  return getQuery<Figure>('SELECT id, name FROM step_figures WHERE id = ?', [id]);
}

export async function findFigures(ids: number[]): Promise<Pick<Figure, 'id'>[]> {
  if (ids.length === 0) return [];
  return allQuery<Pick<Figure, 'id'>>(
    `SELECT id FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
}

export async function findDuplicate(
  name: string,
  excludeId: number | null = null,
): Promise<Pick<Figure, 'id'> | undefined> {
  if (excludeId === null) {
    return getQuery<Pick<Figure, 'id'>>(
      'SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?)',
      [name],
    );
  }
  return getQuery<Pick<Figure, 'id'>>(
    'SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?) AND id != ?',
    [name, excludeId],
  );
}

export async function findCycle(
  componentId: number,
  parentId: number,
): Promise<{ has_cycle: number } | undefined> {
  return getQuery<{ has_cycle: number }>(
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

export async function insertFigure(name: string): Promise<{ id: number } | { error: 'duplicate' }> {
  try {
    const result = await runQuery('INSERT INTO step_figures (name) VALUES (?)', [name]);
    return { id: result.id };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'SQLITE_CONSTRAINT' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('UNIQUE constraint failed: step_figures.name')
    ) {
      return { error: 'duplicate' };
    }
    throw error;
  }
}

export async function renameFigure(id: number, name: string): Promise<WriteResult> {
  return runQuery('UPDATE step_figures SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteComponents(parentId: number): Promise<WriteResult> {
  return runQuery('DELETE FROM step_figure_components WHERE parent_step_figure_id = ?', [parentId]);
}

export async function insertComponent(
  parentId: number,
  childId: number,
  position: number,
): Promise<WriteResult> {
  return runQuery(
    'INSERT INTO step_figure_components (parent_step_figure_id, child_step_figure_id, sort_order) VALUES (?, ?, ?)',
    [parentId, childId, position],
  );
}

export async function findUsage(id: number): Promise<FigureCounts | undefined> {
  return getQuery<FigureCounts>(
    `SELECT
       (SELECT COUNT(*) FROM choreography_step_figures WHERE step_figure_id = ?) AS choreography_usage_count,
       (SELECT COUNT(*) FROM step_figure_components WHERE parent_step_figure_id = ?) AS component_count,
       (SELECT COUNT(*) FROM step_figure_components WHERE child_step_figure_id = ?) AS parent_count`,
    [id, id, id],
  );
}

export async function deleteParentReferences(id: number): Promise<WriteResult> {
  return runQuery('DELETE FROM step_figure_components WHERE child_step_figure_id = ?', [id]);
}

export async function deleteFigure(id: number): Promise<WriteResult> {
  return runQuery('DELETE FROM step_figures WHERE id = ?', [id]);
}
