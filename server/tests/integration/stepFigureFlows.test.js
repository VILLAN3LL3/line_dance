import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as figures from '../../features/step-figures/flow.js';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

describe('step figure integration flows', () => {
  it('creates a hierarchy, detects cycles and protects referenced children', async () => {
    const child = await figures.createFigure({ name: 'Child' });
    const parent = await figures.createFigure({ name: 'Parent', component_ids: [child.value.id] });
    expect(parent.value.components).toEqual([{ id: child.value.id, name: 'Child' }]);
    expect(
      await figures.updateFigure(String(child.value.id), {
        name: 'Child',
        component_ids: [parent.value.id],
      }),
    ).toEqual({ error: 'cycle' });
    expect(await figures.deleteFigure(String(child.value.id))).toEqual({
      error: 'used_as_component',
    });
    expect(await figures.deleteFigure(String(parent.value.id))).toEqual({ value: true });
    expect(await figures.deleteFigure(String(child.value.id))).toEqual({ value: true });
  });

  it('rolls back a newly inserted figure when its component is missing', async () => {
    expect(await figures.createFigure({ name: 'Invalid', component_ids: [99999] })).toEqual({
      error: 'missing_component',
    });
    expect(await figures.getFigureNames()).toEqual([]);
  });

  it('rolls back a rename if replacing components fails', async () => {
    const child = await figures.createFigure({ name: 'Child' });
    const parent = await figures.createFigure({ name: 'Parent' });
    await runQuery(
      "CREATE TEMP TRIGGER fail_component_insert BEFORE INSERT ON step_figure_components BEGIN SELECT RAISE(ABORT, 'Component failure'); END",
    );
    try {
      await expect(
        figures.updateFigure(String(parent.value.id), {
          name: 'Renamed',
          component_ids: [child.value.id],
        }),
      ).rejects.toThrow('Component failure');
      expect(await figures.getFigureNames()).toEqual(['Child', 'Parent']);
    } finally {
      await runQuery('DROP TRIGGER fail_component_insert');
    }
  });
});
