import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.ts';
import { allQuery, runQuery } from '../../scripts/db.ts';
import { runChoreographyMigrations } from '../../migrations/choreography-migrations.ts';
import { removeLearningStatus, setLearningStatus } from '../../features/learning-status/flow.ts';
import { validateLearningStatus } from '../../features/learning-status/validation.ts';

type StatusRow = { choreography_id: number; status: string; status_date: string | null };

async function createChoreography(name: string): Promise<number> {
  const level = await allQuery<{ id: number }>("SELECT id FROM levels WHERE name = 'BEGINNER'");
  const result = await runQuery('INSERT INTO choreographies (name, level_id) VALUES (?, ?)', [
    name,
    level[0].id,
  ]);
  return result.id;
}

async function addTag(choreographyId: number, tagName: string): Promise<void> {
  await runQuery('INSERT OR IGNORE INTO personal_data.tags (name) VALUES (?)', [tagName]);
  await runQuery(
    `INSERT INTO personal_data.choreography_tags (choreography_id, tag_id)
     SELECT ?, id FROM personal_data.tags WHERE name = ?`,
    [choreographyId, tagName],
  );
}

async function statuses(): Promise<StatusRow[]> {
  return allQuery<StatusRow>(
    'SELECT * FROM personal_data.choreography_learning_status ORDER BY choreography_id',
  );
}

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
  await runQuery('DELETE FROM personal_data.choreography_tags');
  await runQuery('DELETE FROM personal_data.tags');
});

describe('learning status flow', () => {
  it('checks the choreography before the status and stores nothing on failure', async () => {
    expect(await setLearningStatus('999', validateLearningStatus({ status: 'x' }))).toEqual({
      error: 'not_found',
    });
    const id = await createChoreography('Dance');
    expect(await setLearningStatus(String(id), validateLearningStatus({ status: 'x' }))).toEqual({
      error: 'invalid_status',
    });
    expect(await setLearningStatus('abc', validateLearningStatus({ status: 'learned' }))).toEqual({
      error: 'invalid_id',
    });
    expect(await statuses()).toEqual([]);
  });

  it('stores, replaces and removes a status', async () => {
    const id = await createChoreography('Dance');
    const set = await setLearningStatus(String(id), validateLearningStatus({ status: 'wishlist' }));
    expect(set).toMatchObject({ value: { choreography_id: id, status: 'wishlist' } });
    await setLearningStatus(String(id), validateLearningStatus({ status: 'learned' }));
    expect(await statuses()).toMatchObject([{ choreography_id: id, status: 'learned' }]);
    expect(await removeLearningStatus(String(id))).toEqual({ value: true });
    expect(await statuses()).toEqual([]);
  });
});

describe('migration 018 — legacy hashtags become learning statuses', () => {
  async function rerunMigration(): Promise<void> {
    await runQuery('DROP TABLE personal_data.choreography_learning_status');
    await runQuery(
      "DELETE FROM schema_migrations WHERE id = '018_add_choreography_learning_status'",
    );
    await runChoreographyMigrations();
  }

  it('migrates both tags without a date, prefers "learned" and removes the tags', async () => {
    const learned = await createChoreography('Learned');
    const wished = await createChoreography('Wished');
    const both = await createChoreography('Both');
    const plain = await createChoreography('Plain');
    await addTag(learned, 'Gelernt');
    await addTag(wished, 'will lernen');
    await addTag(both, 'Gelernt');
    await addTag(both, 'Will Lernen');
    await addTag(plain, 'Country');

    await rerunMigration();

    expect(await statuses()).toEqual([
      { choreography_id: learned, status: 'learned', status_date: null },
      { choreography_id: wished, status: 'wishlist', status_date: null },
      { choreography_id: both, status: 'learned', status_date: null },
    ]);
    const tags = await allQuery<{ name: string }>('SELECT name FROM personal_data.tags');
    expect(tags).toEqual([{ name: 'Country' }]);
    const links = await allQuery<{ choreography_id: number }>(
      'SELECT choreography_id FROM personal_data.choreography_tags',
    );
    expect(links).toEqual([{ choreography_id: plain }]);
  });

  it('ignores tag links of choreographies that no longer exist', async () => {
    await addTag(4242, 'Gelernt');
    await rerunMigration();
    expect(await statuses()).toEqual([]);
  });
});
