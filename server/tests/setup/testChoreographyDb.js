/**
 * Creates and manages an in-memory SQLite database for choreography integration tests.
 * The schema matches init-db.js exactly.
 * Call setupChoreographyTestDb() in beforeAll and clearChoreographyTables() in beforeEach.
 */
import sqlite3 from 'sqlite3';
import { setDatabaseConnection } from '../../db.js';

let testDb = null;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

const DEFAULT_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Experienced'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS choreographies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  step_sheet_link TEXT,
  demo_video_url TEXT,
  tutorial_video_url TEXT,
  count INTEGER,
  wall_count INTEGER,
  level_id INTEGER NOT NULL,
  creation_year INTEGER,
  tag_information TEXT,
  restart_information TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (level_id) REFERENCES levels(id)
);

CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS choreography_authors (
  choreography_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  PRIMARY KEY (choreography_id, author_id),
  FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id)
);

CREATE TABLE IF NOT EXISTS step_figures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS choreography_step_figures (
  choreography_id INTEGER NOT NULL,
  step_figure_id INTEGER NOT NULL,
  PRIMARY KEY (choreography_id, step_figure_id),
  FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
  FOREIGN KEY (step_figure_id) REFERENCES step_figures(id)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS choreography_tags (
  choreography_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (choreography_id, tag_id),
  FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);
`;

export async function setupChoreographyTestDb() {
  testDb = new sqlite3.Database(':memory:');

  await run(testDb, 'PRAGMA foreign_keys = ON');

  await new Promise((resolve, reject) => {
    testDb.exec(SCHEMA, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  for (const level of DEFAULT_LEVELS) {
    await run(testDb, 'INSERT OR IGNORE INTO levels (name) VALUES (?)', [level]);
  }

  setDatabaseConnection('choreography', testDb);
  return testDb;
}

export async function clearChoreographyTables() {
  // Delete choreographies first — FK ON DELETE CASCADE removes junction rows
  await run(testDb, 'DELETE FROM choreographies');
  await run(testDb, 'DELETE FROM authors');
  await run(testDb, 'DELETE FROM tags');
  await run(testDb, 'DELETE FROM step_figures');
  await run(testDb, 'DELETE FROM levels');

  try {
    await run(testDb, 'DELETE FROM saved_filter_configurations');
  } catch {
    // Table is created lazily on first access — may not exist yet
  }

  try {
    await run(testDb, 'DELETE FROM sqlite_sequence');
  } catch {
    // sqlite_sequence doesn't exist until the first autoincrement insert
  }

  // Re-insert default levels so route handlers can look them up
  for (const level of DEFAULT_LEVELS) {
    await run(testDb, 'INSERT OR IGNORE INTO levels (name) VALUES (?)', [level]);
  }
}
