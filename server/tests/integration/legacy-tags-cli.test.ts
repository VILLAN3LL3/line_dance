import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import type { Database } from 'sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const serverDirectory = fileURLToPath(new URL('../..', import.meta.url));
let directory: string;
let sourcePath: string;
let targetPath: string;

async function withDatabase<T>(
  path: string,
  operation: (database: Database) => Promise<T>,
): Promise<T> {
  const database = new sqlite3.Database(path);
  try {
    return await operation(database);
  } finally {
    await new Promise<void>((resolve, reject) => {
      database.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function execute(path: string, sql: string): Promise<void> {
  await withDatabase(path, async (database) => {
    await new Promise<void>((resolve, reject) => {
      database.exec(sql, (error) => (error ? reject(error) : resolve()));
    });
  });
}

async function query<Row>(path: string, sql: string): Promise<Row[]> {
  return withDatabase(
    path,
    async (database) =>
      new Promise<Row[]>((resolve, reject) => {
        database.all<Row>(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
      }),
  );
}

function runScript(): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['scripts/migrate-tags-to-personal-db.ts'], {
    cwd: directory,
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 15_000,
  });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'line-dance-legacy-tags-'));
  mkdirSync(join(directory, 'scripts'));
  mkdirSync(join(directory, 'utils'));
  mkdirSync(join(directory, 'data'));
  copyFileSync(
    join(serverDirectory, 'scripts/migrate-tags-to-personal-db.ts'),
    join(directory, 'scripts/migrate-tags-to-personal-db.ts'),
  );
  copyFileSync(
    join(serverDirectory, 'utils/server-paths.ts'),
    join(directory, 'utils/server-paths.ts'),
  );
  symlinkSync(join(serverDirectory, 'node_modules'), join(directory, 'node_modules'), 'dir');
  sourcePath = join(directory, 'data/line_dance.db');
  targetPath = join(directory, 'data/personal_data.db');
});

afterEach(() => {
  rmSync(join(directory, 'node_modules'), { force: true });
  rmSync(join(directory, 'scripts/migrate-tags-to-personal-db.ts'), { force: true });
  rmSync(join(directory, 'utils/server-paths.ts'), { force: true });
  rmSync(sourcePath, { force: true });
  rmSync(targetPath, { force: true });
  rmSync(`${sourcePath}-journal`, { force: true });
  rmSync(`${targetPath}-journal`, { force: true });
  rmdirSync(join(directory, 'scripts'));
  rmdirSync(join(directory, 'utils'));
  rmdirSync(join(directory, 'data'));
  rmdirSync(directory);
});

describe('legacy tag migration CLI', () => {
  it('copies tags and assignments without duplicating them on a rerun', async () => {
    await execute(
      sourcePath,
      `CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
       CREATE TABLE choreography_tags (choreography_id INTEGER, tag_id INTEGER);
       INSERT INTO tags VALUES (7, 'Favourite');
       INSERT INTO choreography_tags VALUES (42, 7);`,
    );

    expect(runScript().status).toBe(0);
    expect(runScript().status).toBe(0);
    expect(await query(targetPath, 'SELECT id, name FROM tags')).toEqual([
      { id: 7, name: 'Favourite' },
    ]);
    expect(
      await query(targetPath, 'SELECT choreography_id, tag_id FROM choreography_tags'),
    ).toEqual([{ choreography_id: 42, tag_id: 7 }]);
  });

  it('reports a missing legacy schema without copying rows', async () => {
    await execute(sourcePath, 'CREATE TABLE unrelated (id INTEGER)');

    const result = runScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Nothing to migrate.');
    expect(await query(targetPath, 'SELECT id FROM tags')).toEqual([]);
  });

  it('rolls back copied tags when inserting an assignment fails', async () => {
    await execute(
      sourcePath,
      `CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT);
       CREATE TABLE choreography_tags (choreography_id INTEGER, tag_id INTEGER);
       INSERT INTO tags VALUES (7, 'Favourite');
       INSERT INTO choreography_tags VALUES (42, 7);`,
    );
    await execute(
      targetPath,
      `CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
       CREATE TABLE choreography_tags (choreography_id INTEGER NOT NULL, tag_id INTEGER NOT NULL,
         PRIMARY KEY (choreography_id, tag_id));
       CREATE TRIGGER reject_assignment BEFORE INSERT ON choreography_tags
         BEGIN SELECT RAISE(ABORT, 'Assignment failure'); END;`,
    );

    const result = runScript();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Assignment failure');
    expect(await query(targetPath, 'SELECT id FROM tags')).toEqual([]);
    expect(await query(targetPath, 'SELECT tag_id FROM choreography_tags')).toEqual([]);
  });
});
