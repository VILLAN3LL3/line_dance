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
  await run(db, "ATTACH DATABASE ':memory:' AS personal_data");

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
    `INSERT INTO choreographies (name, level_id, count, wall_count, tag_information, restart_information)
     VALUES ('Legacy Tagged Dance', ?, 32, 4, 'Sequence starts after chorus', 'Restart after wall 2')`,
    [level.id],
  );
  await run(
    db,
    `INSERT INTO choreographies (name, level_id, tag_information)
     VALUES ('Legacy Tag Dance', ?, 'Tag on count 8')`,
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
  it('moves legacy information into categorized rows and preserves the legacy columns', async () => {
    await createLegacyChoreographyDatabase();

    const infoRows = await allQuery(
      `SELECT c.name AS choreography, category.name AS category, info.description
       FROM choreography_information info
       JOIN choreography_info_categories category ON category.id = info.category_id
       JOIN choreographies c ON c.id = info.choreography_id
       ORDER BY c.name, category.name`,
    );

    expect(infoRows).toEqual([
      {
        choreography: 'Legacy Tag Dance',
        category: 'Tag',
        description: 'Tag on count 8',
      },
      {
        choreography: 'Legacy Tagged Dance',
        category: 'Restart',
        description: 'Restart after wall 2',
      },
      {
        choreography: 'Legacy Tagged Dance',
        category: 'Sequence',
        description: 'Sequence starts after chorus',
      },
    ]);

    const categories = await request(app).get('/api/choreography-info-categories');
    expect(categories.body.slice(0, 6)).toEqual([
      'Restart',
      'Tag',
      'Ending',
      'Intro',
      'Sequence',
      'Styling',
    ]);

    const legacyRow = await getQuery(
      `SELECT tag_information, restart_information FROM choreographies WHERE name = ?`,
      ['Legacy Tagged Dance'],
    );
    expect(legacyRow).toEqual({
      tag_information: 'Sequence starts after chorus',
      restart_information: 'Restart after wall 2',
    });

    const choreography = await getQuery(`SELECT id FROM choreographies WHERE name = ?`, [
      'Legacy Tagged Dance',
    ]);
    const updateResponse = await request(app)
      .put(`/api/choreographies/${choreography.id}`)
      .send({ name: 'Legacy Tagged Dance', level: 'BEGINNER', choreography_information: [] });
    expect(updateResponse.status).toBe(200);

    const legacyRowAfterUpdate = await getQuery(
      `SELECT tag_information, restart_information FROM choreographies WHERE id = ?`,
      [choreography.id],
    );
    expect(legacyRowAfterUpdate).toEqual(legacyRow);
  });

  it('backfills legacy tag data and exposes it through tags/choreography endpoints', async () => {
    await createLegacyChoreographyDatabase();

    const tagsRes = await request(app).get('/api/tags');
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.body).toEqual(['legacy-tag']);

    const choreosRes = await request(app).get('/api/choreographies');
    expect(choreosRes.status).toBe(200);
    expect(choreosRes.body.data).toHaveLength(2);
    const migratedChoreography = choreosRes.body.data.find(
      (choreography) => choreography.name === 'Legacy Tagged Dance',
    );
    expect(migratedChoreography.tags).toEqual(['legacy-tag']);
  });

  it('is idempotent and does not duplicate backfilled rows on re-run', async () => {
    await createLegacyChoreographyDatabase();

    await runChoreographyMigrations();

    const tagCount = await getQuery('SELECT COUNT(*) as count FROM personal_data.tags');
    const mappingCount = await getQuery(
      'SELECT COUNT(*) as count FROM personal_data.choreography_tags',
    );
    const tagRows = await allQuery('SELECT name FROM personal_data.tags ORDER BY name');

    expect(tagCount?.count).toBe(1);
    expect(mappingCount?.count).toBe(1);
    expect(tagRows.map((row) => row.name)).toEqual(['legacy-tag']);
  });
});
