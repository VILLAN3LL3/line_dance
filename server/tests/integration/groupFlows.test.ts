import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as groups from '../../features/groups/flow.ts';
import {
  prepareBaseFigureId,
  prepareBaseFiguresUpdate,
  prepareMaxLevelUpdate,
  validateGroupName,
} from '../../features/groups/validation.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

describe('group flows', () => {
  it('preserves missing-group precedence over invalid base figure input', async () => {
    expect(
      await groups.updateBaseFigures(prepareBaseFiguresUpdate({ groupId: 'invalid', body: null })),
    ).toEqual({
      error: 'invalid_group_id',
    });
    expect(
      await groups.updateBaseFigures(prepareBaseFiguresUpdate({ groupId: '999', body: null })),
    ).toEqual({
      error: 'base_group_not_found',
    });
    const group = await groups.createGroup(validateGroupName({ name: 'Group' }));
    if ('error' in group || !group.value) throw new Error('Group creation failed');
    await expect(
      groups.updateBaseFigures(
        prepareBaseFiguresUpdate({ groupId: String(group.value.id), body: null }),
      ),
    ).rejects.toThrow(TypeError);
    expect(
      await groups.updateMaxLevel(
        prepareMaxLevelUpdate({ groupId: '999', body: { max_group_level_value: -1 } }),
      ),
    ).toEqual({
      error: 'invalid_max_level',
    });
  });

  it('rolls back replacement when inserting base figures fails', async () => {
    const first = await runQuery("INSERT INTO step_figures (name) VALUES ('Kick')");
    const second = await runQuery("INSERT INTO step_figures (name) VALUES ('Other')");
    const group = await groups.createGroup(validateGroupName({ name: 'Group' }));
    if ('error' in group || !group.value) throw new Error('Group creation failed');
    const groupId = String(group.value.id);
    await runQuery(
      "CREATE TEMP TRIGGER fail_base_figure BEFORE INSERT ON group_base_step_figures BEGIN SELECT RAISE(ABORT, 'Base figure failure'); END",
      [],
      'danceGroups',
    );
    try {
      await expect(
        groups.updateBaseFigures(
          prepareBaseFiguresUpdate({
            groupId,
            body: { step_figure_ids: [second.id] },
          }),
        ),
      ).rejects.toThrow('Base figure failure');
      expect(await groups.getBaseFigures(prepareBaseFigureId({ groupId }))).toEqual({
        value: [{ id: first.id, name: 'Kick' }],
      });
    } finally {
      await runQuery('DROP TRIGGER fail_base_figure', [], 'danceGroups');
    }
  });
});
