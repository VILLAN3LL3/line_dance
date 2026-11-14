import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as filters from '../../features/saved-filters/flow.js';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
  await runQuery('DELETE FROM personal_data.saved_filter_configurations');
});

describe('saved filter flows', () => {
  it('preserves independent concurrent name and filter updates', async () => {
    const saved = await filters.saveConfiguration({ name: 'Original', filters: { search: 'old' } });
    const id = String(saved.value.id);
    await Promise.all([
      filters.updateConfiguration(id, { name: 'Renamed' }),
      filters.updateConfiguration(id, { filters: { search: ' new ' } }),
    ]);
    expect(await filters.getConfigurations()).toMatchObject([
      { id: saved.value.id, name: 'Renamed', filters: { search: 'new' } },
    ]);
    expect(await filters.deleteConfiguration(id)).toEqual({ value: true });
    expect(await filters.getConfigurations()).toEqual([]);
  });

  it('returns domain errors and recovers malformed stored filter JSON', async () => {
    const first = await filters.saveConfiguration({ name: 'First' });
    const second = await filters.saveConfiguration({ name: 'Second' });
    expect(await filters.updateConfiguration(String(second.value.id), { name: 'First' })).toEqual({
      error: 'duplicate_name',
    });
    expect(await filters.updateConfiguration('99999', {})).toEqual({ error: 'not_found' });
    await runQuery(
      'UPDATE personal_data.saved_filter_configurations SET filters_json = ? WHERE id = ?',
      ['{invalid', first.value.id],
    );
    expect((await filters.getConfigurations())[0]).toMatchObject({ name: 'First', filters: {} });
  });
});
