/**
 * One-time migration: copy tags and choreography_tags from data/line_dance.db
 * into data/personal_tags.db.
 *
 * Run once:  node migrate-tags-to-personal-db.js
 */
import sqlite3 from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sourcePath = path.join(__dirname, '..', 'data', 'line_dance.db');
const targetPath = path.join(__dirname, '..', 'data', 'personal_tags.db');

function open(filePath, mode) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, mode, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function tableExists(db, tableName) {
  const rows = await all(db, `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, [
    tableName,
  ]);
  return rows.length > 0;
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function main() {
  const source = await open(sourcePath, sqlite3.OPEN_READONLY);
  const target = await open(targetPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

  // Create schema in target
  await run(
    target,
    `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`,
  );
  await run(
    target,
    `CREATE TABLE IF NOT EXISTS choreography_tags (
    choreography_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (choreography_id, tag_id)
  )`,
  );

  const hasLegacyTags = await tableExists(source, 'tags');
  const hasLegacyJunction = await tableExists(source, 'choreography_tags');
  if (!hasLegacyTags || !hasLegacyJunction) {
    console.log('Legacy tags tables are not present in data/line_dance.db. Nothing to migrate.');
    await close(source);
    await close(target);
    return;
  }

  await run(target, 'BEGIN');
  try {
    const tags = await all(source, 'SELECT id, name FROM tags');
    for (const tag of tags) {
      await run(target, 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', [tag.id, tag.name]);
    }
    console.log(`Migrated ${tags.length} tag(s).`);

    const junctions = await all(source, 'SELECT choreography_id, tag_id FROM choreography_tags');
    for (const row of junctions) {
      await run(
        target,
        'INSERT OR IGNORE INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)',
        [row.choreography_id, row.tag_id],
      );
    }
    console.log(`Migrated ${junctions.length} choreography_tags row(s).`);

    await run(target, 'COMMIT');
  } catch (err) {
    await run(target, 'ROLLBACK');
    throw err;
  }

  await close(source);
  await close(target);
  console.log('Done. data/personal_tags.db is ready.');
}

try {
  await main();
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
