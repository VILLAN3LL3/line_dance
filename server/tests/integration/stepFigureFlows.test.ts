import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.ts';
import { runQuery } from '../../scripts/db.ts';
import * as figures from '../../features/step-figures/flow.ts';
import { validateFigure } from '../../features/step-figures/operations.ts';
import type { HierarchyFigure } from '../../features/step-figures/operations.ts';

async function createFigure(name: string, componentIds: number[] = []): Promise<HierarchyFigure> {
  const result = await figures.createFigure(validateFigure({ name, component_ids: componentIds }));
  if ('error' in result || result.value === null) throw new Error('Failed to create test figure');
  return result.value;
}

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

describe('step figure integration flows', () => {
  it('creates a hierarchy, detects cycles and protects referenced children', async () => {
    const child = await createFigure('Child');
    const parent = await createFigure('Parent', [child.id]);
    expect(parent.components).toEqual([{ id: child.id, name: 'Child' }]);
    expect(
      await figures.updateFigure(
        String(child.id),
        validateFigure({
          name: 'Child',
          component_ids: [parent.id],
        }),
      ),
    ).toEqual({ error: 'cycle' });
    expect(await figures.deleteFigure(String(child.id))).toEqual({
      error: 'used_as_component',
    });
    expect(await figures.deleteFigure(String(parent.id))).toEqual({ value: true });
    expect(await figures.deleteFigure(String(child.id))).toEqual({ value: true });
  });

  it('rolls back a newly inserted figure when its component is missing', async () => {
    expect(
      await figures.createFigure(validateFigure({ name: 'Invalid', component_ids: [99999] })),
    ).toEqual({
      error: 'missing_component',
    });
    expect(await figures.getFigureNames()).toEqual([]);
  });

  it('rolls back a rename if replacing components fails', async () => {
    const child = await createFigure('Child');
    const parent = await createFigure('Parent');
    await runQuery(
      "CREATE TEMP TRIGGER fail_component_insert BEFORE INSERT ON step_figure_components BEGIN SELECT RAISE(ABORT, 'Component failure'); END",
    );
    try {
      await expect(
        figures.updateFigure(
          String(parent.id),
          validateFigure({
            name: 'Renamed',
            component_ids: [child.id],
          }),
        ),
      ).rejects.toThrow('Component failure');
      expect(await figures.getFigureNames()).toEqual(['Child', 'Parent']);
    } finally {
      await runQuery('DROP TRIGGER fail_component_insert');
    }
  });

  it('prioritizes an invalid or missing ID over invalid input and conversion errors', async () => {
    const invalid = validateFigure({ name: '' });
    const exception = { exception: new TypeError('Invalid component') };
    expect(await figures.updateFigure('invalid', invalid)).toEqual({ error: 'invalid_id' });
    expect(await figures.updateFigure('99999', invalid)).toEqual({ error: 'not_found' });
    expect(await figures.updateFigure('invalid', exception)).toEqual({ error: 'invalid_id' });
    expect(await figures.updateFigure('99999', exception)).toEqual({ error: 'not_found' });
    const figure = await createFigure('Existing');
    await expect(figures.updateFigure(String(figure.id), exception)).rejects.toThrow(
      'Invalid component',
    );
    expect(await figures.getFigureNames()).toEqual(['Existing']);
  });
});
