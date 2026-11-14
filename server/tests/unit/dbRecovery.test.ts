import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Database } from 'sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeDatabaseReadonly(database: Database): void {
  vi.spyOn(database, 'run').mockImplementation(function (this: Database, _sql, ...args) {
    const callback = args.at(-1);
    if (typeof callback !== 'function') throw new Error('Expected SQLite callback');
    callback(
      Object.assign(new Error('attempt to write a readonly database'), {
        code: 'SQLITE_READONLY',
      }),
    );
    return this;
  });
}

describe('SQLite replacement recovery', () => {
  let databaseDirectory: string;
  let databasePath: string;
  let databaseModule: typeof import('../../scripts/db.ts');
  let originalEnvironment: Pick<
    NodeJS.ProcessEnv,
    'CHOREOGRAPHY_DB_PATH' | 'DANCE_GROUPS_DB_PATH' | 'TAGS_DB_PATH' | 'NODE_ENV' | 'PM2_HOME'
  >;

  beforeEach(async () => {
    databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'line-dance-db-recovery-'));
    databasePath = path.join(databaseDirectory, 'choreography.db');
    originalEnvironment = {
      CHOREOGRAPHY_DB_PATH: process.env.CHOREOGRAPHY_DB_PATH,
      DANCE_GROUPS_DB_PATH: process.env.DANCE_GROUPS_DB_PATH,
      TAGS_DB_PATH: process.env.TAGS_DB_PATH,
      NODE_ENV: process.env.NODE_ENV,
      PM2_HOME: process.env.PM2_HOME,
    };

    process.env.CHOREOGRAPHY_DB_PATH = databasePath;
    process.env.DANCE_GROUPS_DB_PATH = path.join(databaseDirectory, 'dance-groups.db');
    process.env.TAGS_DB_PATH = path.join(databaseDirectory, 'personal-data.db');
    process.env.NODE_ENV = 'test';
    process.env.PM2_HOME = path.join(databaseDirectory, 'pm2');

    vi.resetModules();
    databaseModule = await import('../../scripts/db.ts');
    await databaseModule.runQuery('CREATE TABLE recovery_test (id INTEGER PRIMARY KEY)');
  });

  afterEach(async () => {
    await databaseModule.closeDatabase();
    vi.restoreAllMocks();

    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it('marks a read-only error as a database restart only after file replacement', async () => {
    const database = databaseModule.getDatabase();
    const originalDatabasePath = path.join(databaseDirectory, 'original.db');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    fs.renameSync(databasePath, originalDatabasePath);
    fs.writeFileSync(databasePath, 'replacement database');

    makeDatabaseReadonly(database);

    await expect(databaseModule.runQuery('UPDATE recovery_test SET id = id')).rejects.toMatchObject(
      {
        code: 'DATABASE_RESTARTING',
      },
    );
    expect(exitSpy).not.toHaveBeenCalled();

    databaseModule.restartAfterDatabaseResponse();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not restart PM2 for a read-only error when the database file is unchanged', async () => {
    const database = databaseModule.getDatabase();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    makeDatabaseReadonly(database);

    await expect(databaseModule.runQuery('UPDATE recovery_test SET id = id')).rejects.toMatchObject(
      {
        code: 'SQLITE_READONLY',
      },
    );
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('still identifies a replaced database when PM2 is not managing the process', async () => {
    const database = databaseModule.getDatabase();
    const originalDatabasePath = path.join(databaseDirectory, 'original.db');
    delete process.env.PM2_HOME;
    fs.renameSync(databasePath, originalDatabasePath);
    fs.writeFileSync(databasePath, 'replacement database');
    makeDatabaseReadonly(database);

    await expect(databaseModule.runQuery('UPDATE recovery_test SET id = id')).rejects.toMatchObject(
      {
        code: 'DATABASE_RESTARTING',
      },
    );
  });
});
