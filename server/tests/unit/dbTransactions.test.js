import sqlite3 from 'sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  allQuery,
  closeDatabase,
  getDatabase,
  runQuery,
  setDatabaseConnection,
  withTransaction,
} from '../../scripts/db.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('SQLite transactions', () => {
  beforeEach(async () => {
    setDatabaseConnection('choreography', new sqlite3.Database(':memory:'));
    setDatabaseConnection('danceGroups', new sqlite3.Database(':memory:'));
    await runQuery('CREATE TABLE entries (value TEXT)');
    await runQuery('CREATE TABLE entries (value TEXT)', [], 'danceGroups');
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('rolls back its changes without absorbing another request on the same connection', async () => {
    const entered = deferred();
    const proceed = deferred();
    const transaction = withTransaction('choreography', async () => {
      await runQuery("INSERT INTO entries VALUES ('rolled back')");
      entered.resolve();
      await proceed.promise;
      throw new Error('transaction failed');
    });
    await entered.promise;
    const outside = runQuery("INSERT INTO entries VALUES ('independent')");
    const otherDatabase = await runQuery("INSERT INTO entries VALUES ('other')", [], 'danceGroups');
    expect(otherDatabase.changes).toBe(1);
    proceed.resolve();
    await expect(transaction).rejects.toThrow('transaction failed');
    await outside;
    expect(await allQuery('SELECT value FROM entries')).toEqual([{ value: 'independent' }]);
  });

  it('rejects nested transactions rather than silently committing the outer transaction', async () => {
    await expect(
      withTransaction('choreography', () => withTransaction('choreography', async () => {})),
    ).rejects.toThrow('Nested transactions');
    await runQuery("INSERT INTO entries VALUES ('after')");
    expect(await allQuery('SELECT value FROM entries')).toEqual([{ value: 'after' }]);
  });

  it('uses the same transaction when database names reference the same connection', async () => {
    const groupsDatabase = getDatabase('danceGroups');
    setDatabaseConnection('danceGroups', getDatabase('choreography'));
    try {
      await expect(
        withTransaction('choreography', async () => {
          await runQuery("INSERT INTO entries VALUES ('rolled back')", [], 'danceGroups');
          await withTransaction('danceGroups', async () => {});
        }),
      ).rejects.toThrow('Nested transactions');
      expect(await allQuery('SELECT value FROM entries')).toEqual([]);
    } finally {
      setDatabaseConnection('danceGroups', groupsDatabase);
    }
  });
});

it('rolls back changes to an attached file without affecting the separate groups database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'line-dance-transactions-'));
  try {
    setDatabaseConnection('choreography', new sqlite3.Database(join(directory, 'choreography.db')));
    setDatabaseConnection('danceGroups', new sqlite3.Database(join(directory, 'groups.db')));
    await runQuery('ATTACH DATABASE ? AS personal_data', [join(directory, 'personal.db')]);
    await runQuery('CREATE TABLE entries (value TEXT)');
    await runQuery('CREATE TABLE personal_data.entries (value TEXT)');
    await runQuery('CREATE TABLE entries (value TEXT)', [], 'danceGroups');

    await expect(
      withTransaction('choreography', async () => {
        await runQuery("INSERT INTO entries VALUES ('rolled back')");
        await runQuery("INSERT INTO personal_data.entries VALUES ('rolled back')");
        await runQuery("INSERT INTO entries VALUES ('independent')", [], 'danceGroups');
        throw new Error('transaction failed');
      }),
    ).rejects.toThrow('transaction failed');

    expect(await allQuery('SELECT value FROM entries')).toEqual([]);
    expect(await allQuery('SELECT value FROM personal_data.entries')).toEqual([]);
    expect(await allQuery('SELECT value FROM entries', [], 'danceGroups')).toEqual([
      { value: 'independent' },
    ]);
  } finally {
    await closeDatabase();
    rmSync(directory, { recursive: true, force: true });
  }
});
