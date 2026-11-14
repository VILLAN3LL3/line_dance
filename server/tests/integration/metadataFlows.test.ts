import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as metadata from '../../features/metadata/flow.ts';
import { prepareLevel } from '../../features/metadata/operations.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

describe('metadata flows', () => {
  it('serializes default level values and detects duplicate names case-insensitively', async () => {
    const levels = await metadata.getLevels();
    const max = Math.max(...levels.map((level) => level.value ?? 0));
    const [first, second] = await Promise.all([
      metadata.addLevel(prepareLevel({ name: 'New One' })),
      metadata.addLevel(prepareLevel({ name: 'New Two' })),
    ]);
    if ('error' in first || 'error' in second) throw new Error('Failed to create levels');
    expect([first.value.value, second.value.value].sort((a, b) => a - b)).toEqual([
      max + 10,
      max + 20,
    ]);
    expect(await metadata.addLevel(prepareLevel({ name: 'new one', value: 'invalid' }))).toEqual({
      error: 'duplicate_level',
    });
  });

  it('prioritizes duplicate names over value conversion errors and preserves data on failure', async () => {
    const invalidValue = { toString: null };
    expect(
      await metadata.addLevel(prepareLevel({ name: 'BEGINNER', value: invalidValue })),
    ).toEqual({
      error: 'duplicate_level',
    });
    await expect(
      metadata.addLevel(prepareLevel({ name: 'New', value: invalidValue })),
    ).rejects.toThrow(TypeError);
    expect((await metadata.getLevels()).some((level) => level.name === 'New')).toBe(false);
  });

  it('rolls back and propagates unexpected persistence errors', async () => {
    await runQuery(
      "CREATE TEMP TRIGGER fail_level_insert BEFORE INSERT ON levels BEGIN SELECT RAISE(ABORT, 'Level failure'); END",
    );
    try {
      await expect(metadata.addLevel(prepareLevel({ name: 'New' }))).rejects.toThrow(
        'Level failure',
      );
      expect((await metadata.getLevels()).some((level) => level.name === 'New')).toBe(false);
    } finally {
      await runQuery('DROP TRIGGER fail_level_insert');
    }
  });

  it('aggregates stored author statistics and returns country aliases', async () => {
    const author = await runQuery("INSERT INTO authors (name) VALUES ('Author')");
    const dance = await runQuery(
      "INSERT INTO choreographies (name, level_id) SELECT 'Dance', id FROM levels LIMIT 1",
    );
    await runQuery('INSERT INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)', [
      dance.id,
      author.id,
    ]);
    expect(await metadata.getAuthorStats()).toEqual([
      expect.objectContaining({ name: 'Author', total: 1 }),
    ]);
    expect((await metadata.getCountryCodes()).IRE).toBe('Ireland');
  });
});
