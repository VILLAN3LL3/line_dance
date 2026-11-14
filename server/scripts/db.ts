import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Database } from 'sqlite3';

type DatabaseName = 'choreography' | 'danceGroups' | 'tags';
type DatabaseError = NodeJS.ErrnoException;
type TransactionContext = { db: Database; active: boolean };
export type WriteResult = { id: number; changes: number };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

const isInMemorySafetyMode = [
  process.env.CHOREOGRAPHY_DB_PATH,
  process.env.DANCE_GROUPS_DB_PATH,
  process.env.TAGS_DB_PATH,
].includes(':memory:');

function resolveDatabasePath(inputPath: string | undefined, fallbackFileName: string): string {
  if (inputPath === ':memory:') {
    return ':memory:';
  }

  if (typeof inputPath === 'string' && inputPath.trim()) {
    return path.isAbsolute(inputPath) ? inputPath : path.join(serverRoot, inputPath);
  }

  if (isInMemorySafetyMode) {
    return ':memory:';
  }

  return path.join(serverRoot, 'data', fallbackFileName);
}

const databases = {
  choreography: resolveDatabasePath(process.env.CHOREOGRAPHY_DB_PATH, 'line_dance.db'),
  danceGroups: resolveDatabasePath(process.env.DANCE_GROUPS_DB_PATH, 'dance_groups.db'),
  tags: resolveDatabasePath(process.env.TAGS_DB_PATH, 'personal_data.db'),
};

export const DATABASE_RESTARTING_ERROR_CODE = 'DATABASE_RESTARTING';

let dbConnections: Partial<Record<DatabaseName, Database>> = {};
let dbReadyPromises: Partial<Record<DatabaseName, Promise<void>>> = {};
const openedDatabaseFiles = new Map<DatabaseName, Map<string, string>>();
let restartScheduled = false;
let restartExitScheduled = false;
const connectionQueues = new WeakMap<Database, Promise<void>>();
const transactionContext = new AsyncLocalStorage<TransactionContext>();

async function runExclusively<T>(db: Database, action: () => T | Promise<T>): Promise<T> {
  const previous = connectionQueues.get(db) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  connectionQueues.set(db, current);
  return previous.then(action).finally(() => {
    if (connectionQueues.get(db) === current) connectionQueues.delete(db);
    release();
  });
}

async function runOnConnection<T>(db: Database, action: () => T | Promise<T>): Promise<T> {
  const context = transactionContext.getStore();
  if (context?.db === db && context.active) return action();
  return runExclusively(db, action);
}

function getFileIdentity(filePath: string): string | null {
  if (filePath === ':memory:') return null;

  try {
    const { dev, ino } = fs.statSync(filePath);
    return `${dev}:${ino}`;
  } catch {
    return null;
  }
}

function rememberDatabaseFile(name: DatabaseName, filePath: string): void {
  const identity = getFileIdentity(filePath);
  if (!identity) return;

  const files = openedDatabaseFiles.get(name) || new Map();
  files.set(filePath, identity);
  openedDatabaseFiles.set(name, files);
}

function restartIfDatabaseWasReplaced(error: DatabaseError, name: DatabaseName): void {
  const isReadonlyError =
    error?.code === 'SQLITE_READONLY' || error?.code?.startsWith('SQLITE_READONLY_');
  if (!isReadonlyError) return;

  const openFiles = openedDatabaseFiles.get(name);
  if (!openFiles) return;

  const replacedPaths = [...openFiles].filter(([filePath, originalIdentity]) => {
    const currentIdentity = getFileIdentity(filePath);
    return currentIdentity && currentIdentity !== originalIdentity;
  });
  if (replacedPaths.length === 0) return;

  error.code = DATABASE_RESTARTING_ERROR_CODE;
  if (restartScheduled) return;

  restartScheduled = true;
  if (!process.env.PM2_HOME) return;

  process.stderr.write(
    `[db] SQLite file replaced while open (${replacedPaths.map(([filePath]) => path.basename(filePath)).join(', ')}); restarting for PM2 recovery\n`,
  );
}

export function restartAfterDatabaseResponse(): void {
  if (!process.env.PM2_HOME || !restartScheduled || restartExitScheduled) return;

  restartExitScheduled = true;
  setImmediate(() => process.exit(1));
}

export function getDatabase(name: DatabaseName = 'choreography'): Database {
  let db = dbConnections[name];
  if (!db) {
    const dbPath = databases[name];
    if (!dbPath) {
      throw new Error(`Unknown database: ${name}`);
    }

    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        // Skip logging in production
      } else {
        rememberDatabaseFile(name, dbPath);
      }
    });
    dbConnections[name] = db;
    db.configure('busyTimeout', 5000);
    dbReadyPromises[name] = Promise.resolve();

    if (name === 'choreography') {
      const tagsDbPath = databases.tags;
      if (tagsDbPath !== ':memory:') {
        fs.mkdirSync(path.dirname(tagsDbPath), { recursive: true });
      }
      const connection = db;
      dbReadyPromises[name] = new Promise<void>((resolve, reject) => {
        connection.run(`ATTACH DATABASE ? AS personal_data`, [tagsDbPath], (err) => {
          if (err) {
            if (process.env.NODE_ENV !== 'test') {
              process.stderr.write(
                `[db] Failed to attach personal_data database: ${err.message}\n`,
              );
            }
            reject(err);
            return;
          }
          rememberDatabaseFile(name, tagsDbPath);
          resolve();
        });
      });
    }
  }
  return db;
}

async function getReadyDatabase(name: DatabaseName = 'choreography'): Promise<Database> {
  const db = getDatabase(name);
  await (dbReadyPromises[name] ?? Promise.resolve());
  return db;
}
export async function runQuery(
  query: string,
  params: unknown[] = [],
  dbName: DatabaseName = 'choreography',
): Promise<WriteResult> {
  const db = await getReadyDatabase(dbName);
  return runOnConnection(
    db,
    () =>
      new Promise<WriteResult>((resolve, reject) => {
        db.run(query, params, function (err) {
          if (err) {
            restartIfDatabaseWasReplaced(err, dbName);
            reject(err);
          } else resolve({ id: this.lastID, changes: this.changes });
        });
      }),
  );
}

export async function getQuery<Row = unknown>(
  query: string,
  params: unknown[] = [],
  dbName: DatabaseName = 'choreography',
): Promise<Row | undefined> {
  const db = await getReadyDatabase(dbName);
  return runOnConnection(
    db,
    () =>
      new Promise<Row | undefined>((resolve, reject) => {
        db.get<Row | undefined>(query, params, (err, row) => {
          if (err) {
            restartIfDatabaseWasReplaced(err, dbName);
            reject(err);
          } else resolve(row);
        });
      }),
  );
}

export async function allQuery<Row = unknown>(
  query: string,
  params: unknown[] = [],
  dbName: DatabaseName = 'choreography',
): Promise<Row[]> {
  const db = await getReadyDatabase(dbName);
  return runOnConnection(
    db,
    () =>
      new Promise<Row[]>((resolve, reject) => {
        db.all<Row>(query, params, (err, rows) => {
          if (err) {
            restartIfDatabaseWasReplaced(err, dbName);
            reject(err);
          } else resolve(rows || []);
        });
      }),
  );
}

export async function withTransaction<T>(
  dbName: DatabaseName,
  action: () => T | Promise<T>,
): Promise<T> {
  const db = await getReadyDatabase(dbName);
  const current = transactionContext.getStore();
  if (current?.db === db && current.active) {
    throw new Error('Nested transactions on the same connection are not supported');
  }
  return runExclusively(db, () => {
    const context = { db, active: true };
    return transactionContext.run(context, async () => {
      try {
        await runQuery('BEGIN IMMEDIATE TRANSACTION', [], dbName);
        try {
          const result = await action();
          await runQuery('COMMIT', [], dbName);
          return result;
        } catch (error) {
          try {
            await runQuery('ROLLBACK', [], dbName);
          } catch (rollbackError) {
            process.stderr.write(`[db] Transaction rollback failed: ${String(rollbackError)}\n`);
          }
          throw error;
        }
      } finally {
        context.active = false;
      }
    });
  });
}

export function setDatabaseConnection(name: DatabaseName, db: Database): void {
  dbConnections[name] = db;
  dbReadyPromises[name] = Promise.resolve();
  openedDatabaseFiles.delete(name);
}

export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const connections = Object.values(dbConnections);
    let closedCount = 0;
    let hasError = false;

    if (connections.length === 0) {
      resolve();
      return;
    }

    connections.forEach((db) => {
      if (db) {
        db.close((err) => {
          if (err && !hasError) {
            hasError = true;
            reject(err);
          } else {
            closedCount++;
            if (closedCount === connections.length) {
              dbConnections = {};
              dbReadyPromises = {};
              openedDatabaseFiles.clear();
              restartScheduled = false;
              restartExitScheduled = false;
              resolve();
            }
          }
        });
      } else {
        closedCount++;
        if (closedCount === connections.length) {
          dbReadyPromises = {};
          resolve();
        }
      }
    });
  });
}
