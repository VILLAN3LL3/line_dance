import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import sqlite3 from 'sqlite3';

import app from '../setup/testChoreographyApp.js';
import { setDatabaseConnection, closeDatabase, allQuery, getQuery } from '../../scripts/db.js';
import { runChoreographyMigrations } from '../../migrations/choreography-migrations.js';

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function createLegacyChoreographyDatabase() {
  const db = new sqlite3.Database(':memory:');

  await run(db, 'PRAGMA foreign_keys = ON');
  await run(db, "ATTACH DATABASE ':memory:' AS personal_tags");

  // Simulate pre-split schema/data in main DB.
  await run(
    db,
    `CREATE TABLE levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`,
  );
  await run(
    db,
    `CREATE TABLE choreographies (
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
  )`,
  );
  await run(
    db,
    `CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`,
  );
  await run(
    db,
    `CREATE TABLE choreography_tags (
    choreography_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (choreography_id, tag_id)
  )`,
  );

  const level = await run(db, `INSERT INTO levels (name) VALUES ('Beginner')`);
  const choreo = await run(
    db,
    `INSERT INTO choreographies (name, level_id, count, wall_count)
     VALUES ('Legacy Tagged Dance', ?, 32, 4)`,
    [level.id],
  );
  const tag = await run(db, `INSERT INTO tags (name) VALUES ('legacy-tag')`);
  await run(db, `INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)`, [
    choreo.id,
    tag.id,
  ]);

  setDatabaseConnection('choreography', db);
  await runChoreographyMigrations();

  return db;
}

afterEach(async () => {
  await closeDatabase();
});

describe('Choreography tags migration regression', () => {
  it('backfills legacy tag data and exposes it through tags/choreography endpoints', async () => {
    await createLegacyChoreographyDatabase();

    const tagsRes = await request(app).get('/api/tags');
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.body).toEqual(['legacy-tag']);

    const choreosRes = await request(app).get('/api/choreographies');
    expect(choreosRes.status).toBe(200);
    expect(choreosRes.body.data).toHaveLength(1);
    expect(choreosRes.body.data[0].name).toBe('Legacy Tagged Dance');
    expect(choreosRes.body.data[0].tags).toEqual(['legacy-tag']);
  });

  it('is idempotent and does not duplicate backfilled rows on re-run', async () => {
    await createLegacyChoreographyDatabase();

    await runChoreographyMigrations();

    const tagCount = await getQuery('SELECT COUNT(*) as count FROM personal_tags.tags');
    const mappingCount = await getQuery(
      'SELECT COUNT(*) as count FROM personal_tags.choreography_tags',
    );
    const tagRows = await allQuery('SELECT name FROM personal_tags.tags ORDER BY name');

    expect(tagCount?.count).toBe(1);
    expect(mappingCount?.count).toBe(1);
    expect(tagRows.map((row) => row.name)).toEqual(['legacy-tag']);
  });
});
