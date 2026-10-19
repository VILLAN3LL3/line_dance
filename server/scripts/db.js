import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

const isInMemorySafetyMode = [
  process.env.CHOREOGRAPHY_DB_PATH,
  process.env.DANCE_GROUPS_DB_PATH,
  process.env.TAGS_DB_PATH,
].includes(':memory:');

function resolveDatabasePath(inputPath, fallbackFileName) {
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

let dbConnections = {};
let dbReadyPromises = {};
const openedDatabaseFiles = new Map();
let restartScheduled = false;
let restartExitScheduled = false;

function getFileIdentity(filePath) {
  if (filePath === ':memory:') return null;

  try {
    const { dev, ino } = fs.statSync(filePath);
    return `${dev}:${ino}`;
  } catch {
    return null;
  }
}

function rememberDatabaseFile(name, filePath) {
  const identity = getFileIdentity(filePath);
  if (!identity) return;

  const files = openedDatabaseFiles.get(name) || new Map();
  files.set(filePath, identity);
  openedDatabaseFiles.set(name, files);
}

function restartIfDatabaseWasReplaced(error, name) {
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

export function restartAfterDatabaseResponse() {
  if (!process.env.PM2_HOME || !restartScheduled || restartExitScheduled) return;

  restartExitScheduled = true;
  setImmediate(() => process.exit(1));
}

export function getDatabase(name = 'choreography') {
  if (!dbConnections[name]) {
    const dbPath = databases[name];
    if (!dbPath) {
      throw new Error(`Unknown database: ${name}`);
    }

    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    dbConnections[name] = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        // Skip logging in production
      } else {
        rememberDatabaseFile(name, dbPath);
      }
    });
    dbConnections[name].configure('busyTimeout', 5000);
    dbReadyPromises[name] = Promise.resolve();

    if (name === 'choreography') {
      const tagsDbPath = databases.tags;
      if (tagsDbPath !== ':memory:') {
        fs.mkdirSync(path.dirname(tagsDbPath), { recursive: true });
      }
      dbReadyPromises[name] = new Promise((resolve, reject) => {
        dbConnections[name].run(`ATTACH DATABASE ? AS personal_data`, [tagsDbPath], (err) => {
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
  return dbConnections[name];
}

async function getReadyDatabase(name = 'choreography') {
  const db = getDatabase(name);
  await (dbReadyPromises[name] || Promise.resolve());
  return db;
}
export function runQuery(query, params = [], dbName = 'choreography') {
  return getReadyDatabase(dbName).then(
    (db) =>
      new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
          if (err) {
            restartIfDatabaseWasReplaced(err, dbName);
            reject(err);
          } else resolve({ id: this.lastID, changes: this.changes });
        });
      }),
  );
}

export function getQuery(query, params = [], dbName = 'choreography') {
  return getReadyDatabase(dbName).then(
    (db) =>
      new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) {
            restartIfDatabaseWasReplaced(err, dbName);
            reject(err);
          } else resolve(row);
        });
      }),
  );
}

export function allQuery(query, params = [], dbName = 'choreography') {
  return getReadyDatabase(dbName).then(
    (db) =>
      new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) {
            restartIfDatabaseWasReplaced(err, dbName);
            reject(err);
          } else resolve(rows || []);
        });
      }),
  );
}

export function setDatabaseConnection(name, db) {
  dbConnections[name] = db;
  dbReadyPromises[name] = Promise.resolve();
  openedDatabaseFiles.delete(name);
}

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    const dbNames = Object.keys(dbConnections);
    let closedCount = 0;
    let hasError = false;

    if (dbNames.length === 0) {
      resolve();
      return;
    }

    dbNames.forEach((name) => {
      const db = dbConnections[name];
      if (db) {
        db.close((err) => {
          if (err && !hasError) {
            hasError = true;
            reject(err);
          } else {
            closedCount++;
            if (closedCount === dbNames.length) {
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
        if (closedCount === dbNames.length) {
          dbReadyPromises = {};
          resolve();
        }
      }
    });
  });
}
