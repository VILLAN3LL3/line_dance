/**
 * One-time migration: copy tags and choreography_tags from data/line_dance.db
 * into data/personal_data.db.
 *
 * Run once from server/: node dist/scripts/migrate-tags-to-personal-db.js
 */
import sqlite3 from 'sqlite3';
import type { Database } from 'sqlite3';
import path from 'node:path';
import { serverRoot } from '../utils/server-paths.ts';

const sourcePath = path.join(serverRoot, 'data', 'line_dance.db');
const targetPath = path.join(serverRoot, 'data', 'personal_data.db');

type SqlValue = string | number | null;
type TagRow = { id: number; name: string };
type JunctionRow = { choreography_id: number | null; tag_id: number | null };

async function open(filePath: string, mode: number): Promise<Database> {
  return new Promise<Database>((resolve, reject) => {
    const db = new sqlite3.Database(filePath, mode, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function run(
  db: Database,
  sql: string,
  params: SqlValue[] = [],
): Promise<{ id: number; changes: number }> {
  return new Promise<{ id: number; changes: number }>((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function all<Row>(db: Database, sql: string, params: SqlValue[] = []): Promise<Row[]> {
  return new Promise<Row[]>((resolve, reject) => {
    db.all<Row>(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function tableExists(db: Database, tableName: string): Promise<boolean> {
  const rows = await all<{ name: string }>(
    db,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName],
  );
  return rows.length > 0;
}

async function close(db: Database): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function main(): Promise<void> {
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
    const tags = await all<TagRow>(source, 'SELECT id, name FROM tags');
    await tags.reduce(
      (previous, tag) =>
        previous.then(async () => {
          await run(target, 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', [
            tag.id,
            tag.name,
          ]);
        }),
      Promise.resolve(),
    );
    console.log(`Migrated ${tags.length} tag(s).`);

    const junctions = await all<JunctionRow>(
      source,
      'SELECT choreography_id, tag_id FROM choreography_tags',
    );
    await junctions.reduce(
      (previous, row) =>
        previous.then(async () => {
          await run(
            target,
            'INSERT OR IGNORE INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)',
            [row.choreography_id, row.tag_id],
          );
        }),
      Promise.resolve(),
    );
    console.log(`Migrated ${junctions.length} choreography_tags row(s).`);

    await run(target, 'COMMIT');
  } catch (err) {
    await run(target, 'ROLLBACK');
    throw err;
  }

  await close(source);
  await close(target);
  console.log('Done. data/personal_data.db is ready.');
}

try {
  await main();
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
