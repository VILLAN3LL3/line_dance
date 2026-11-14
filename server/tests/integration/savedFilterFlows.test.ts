import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as filters from '../../features/saved-filters/flow.ts';
import {
  prepareConfigurationSave,
  prepareConfigurationUpdate,
} from '../../features/saved-filters/operations.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
  await runQuery('DELETE FROM personal_data.saved_filter_configurations');
});

describe('saved filter flows', () => {
  it('preserves independent concurrent name and filter updates', async () => {
    const saved = await filters.saveConfiguration(
      prepareConfigurationSave({ name: 'Original', filters: { search: 'old' } }),
    );
    if ('error' in saved) throw new Error('Failed to create test configuration');
    const id = String(saved.value.id);
    await Promise.all([
      filters.updateConfiguration(id, prepareConfigurationUpdate({ name: 'Renamed' })),
      filters.updateConfiguration(id, prepareConfigurationUpdate({ filters: { search: ' new ' } })),
    ]);
    expect(await filters.getConfigurations()).toMatchObject([
      { id: saved.value.id, name: 'Renamed', filters: { search: 'new' } },
    ]);
    expect(await filters.deleteConfiguration(id)).toEqual({ value: true });
    expect(await filters.getConfigurations()).toEqual([]);
  });

  it('returns domain errors and recovers malformed stored filter JSON', async () => {
    const first = await filters.saveConfiguration(prepareConfigurationSave({ name: 'First' }));
    const second = await filters.saveConfiguration(prepareConfigurationSave({ name: 'Second' }));
    if ('error' in first || 'error' in second)
      throw new Error('Failed to create test configurations');
    expect(
      await filters.updateConfiguration(
        String(second.value.id),
        prepareConfigurationUpdate({ name: 'First' }),
      ),
    ).toEqual({
      error: 'duplicate_name',
    });
    expect(await filters.updateConfiguration('99999', prepareConfigurationUpdate({}))).toEqual({
      error: 'not_found',
    });
    await runQuery(
      'UPDATE personal_data.saved_filter_configurations SET filters_json = ? WHERE id = ?',
      ['{invalid', first.value.id],
    );
    expect((await filters.getConfigurations())[0]).toMatchObject({ name: 'First', filters: {} });
  });

  it('persists compatible filter coercions and rejects conversion failures', async () => {
    const saved = await filters.saveConfiguration(
      prepareConfigurationSave({
        name: 'Numbers',
        filters: { max_count: '12suffix', min_rating: [3] },
      }),
    );
    if ('error' in saved) throw new Error('Failed to create test configuration');
    expect(saved.value.filters).toEqual({ max_count: 12, min_rating: 3 });
    expect(() =>
      prepareConfigurationUpdate({ filters: { max_count: { toString: null } } }),
    ).toThrow(TypeError);
    await expect(
      filters.updateConfiguration(String(saved.value.id), {
        exception: new TypeError('Invalid filter'),
      }),
    ).rejects.toThrow(TypeError);
    expect(await filters.getConfigurations()).toMatchObject([
      { filters: { max_count: 12, min_rating: 3 } },
    ]);
  });

  it('propagates unexpected update failures and preserves the stored configuration', async () => {
    const saved = await filters.saveConfiguration(
      prepareConfigurationSave({ name: 'Original', filters: { search: 'old' } }),
    );
    if ('error' in saved) throw new Error('Failed to create test configuration');
    await runQuery(
      "CREATE TEMP TRIGGER reject_filter_update BEFORE UPDATE ON personal_data.saved_filter_configurations BEGIN SELECT RAISE(ABORT, 'Forced filter failure'); END",
    );
    try {
      await expect(
        filters.updateConfiguration(
          String(saved.value.id),
          prepareConfigurationUpdate({ name: 'Changed', filters: { search: 'new' } }),
        ),
      ).rejects.toThrow('Forced filter failure');
      expect(await filters.getConfigurations()).toMatchObject([
        { name: 'Original', filters: { search: 'old' } },
      ]);
    } finally {
      await runQuery('DROP TRIGGER reject_filter_update');
    }
  });
});
