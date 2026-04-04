/**
 * Creates and manages an in-memory SQLite database for integration tests.
 * Uses the real migration system so the schema always matches production.
 * Call setupTestDb() in beforeAll and clearAllTables() in beforeEach.
 */
import sqlite3 from 'sqlite3';
import { setDatabaseConnection } from '../../scripts/db.js';
import { runDanceGroupsMigrations } from '../../migrations/dance-groups-migrations.js';

let testDb = null;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export async function setupTestDb() {
  testDb = new sqlite3.Database(':memory:');

  // Enable foreign key enforcement (OFF by default in SQLite)
  await run(testDb, 'PRAGMA foreign_keys = ON');

  // Inject the in-memory DB before running migrations so all runQuery calls
  // in the migration system target this instance instead of the real file.
  setDatabaseConnection('danceGroups', testDb);

  // Run the real migrations — same schema as production
  await runDanceGroupsMigrations();

  return testDb;
}

export async function clearAllTables() {
  const tables = [
    'session_choreographies',
    'sessions',
    'dance_courses',
    'group_levels',
    'trainers',
    'dance_groups',
  ];
  for (const table of tables) {
    await run(testDb, `DELETE FROM ${table}`);
  }
  // Reset autoincrement counters; sqlite_sequence is created on first insert,
  // so this is a no-op until data has been inserted.
  try {
    await run(testDb, 'DELETE FROM sqlite_sequence');
  } catch {
    // sqlite_sequence doesn't exist until the first autoincrement insert
  }
}
