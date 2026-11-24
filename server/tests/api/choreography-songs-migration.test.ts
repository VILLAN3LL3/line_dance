import { afterEach, describe, expect, it } from 'vitest';
import sqlite3 from 'sqlite3';
import type { Database } from 'sqlite3';

import { setDatabaseConnection, closeDatabase, allQuery, runQuery } from '../../scripts/db.ts';
import { runChoreographyMigrations } from '../../migrations/choreography-migrations.ts';

async function open(): Promise<Database> {
  const db = new sqlite3.Database(':memory:');
  setDatabaseConnection('choreography', db);
  await runQuery("ATTACH DATABASE ':memory:' AS personal_data", [], 'choreography');
  await runChoreographyMigrations();
  return db;
}

async function insertLegacyDance(
  name: string,
  song: string | null,
  artist: string | null,
): Promise<void> {
  await runQuery(
    `INSERT INTO choreographies (name, level_id, song, artist)
     VALUES (?, (SELECT id FROM levels LIMIT 1), ?, ?)`,
    [name, song, artist],
    'choreography',
  );
}

afterEach(async () => {
  await closeDatabase();
});

describe('choreography songs migration', () => {
  it('moves the legacy song and artist columns into choreography_songs and drops them', async () => {
    await open();
    const columns = async (): Promise<string[]> =>
      (
        await allQuery<{ name: string }>("SELECT name FROM pragma_table_info('choreographies')")
      ).map((column) => column.name);
    expect(await columns()).not.toContain('song');
    expect(await columns()).not.toContain('artist');

    // Simulate a database from before the migration.
    await runQuery('ALTER TABLE choreographies ADD COLUMN song TEXT');
    await runQuery('ALTER TABLE choreographies ADD COLUMN artist TEXT');
    await insertLegacyDance('Both', ' Song A ', ' Artist A ');
    await insertLegacyDance('Title only', 'Song B', null);
    await insertLegacyDance('Artist only', '', 'Artist C');
    await insertLegacyDance('Blank', '  ', null);
    await insertLegacyDance('None', null, null);
    await runQuery("DELETE FROM schema_migrations WHERE id = '016_create_choreography_songs'");
    await runQuery('DELETE FROM choreography_songs');

    await runChoreographyMigrations();

    expect(
      await allQuery(
        `SELECT c.name AS dance, s.title, s.artist, s.position
         FROM choreography_songs s JOIN choreographies c ON c.id = s.choreography_id
         ORDER BY c.id`,
      ),
    ).toEqual([
      { dance: 'Both', title: 'Song A', artist: 'Artist A', position: 0 },
      { dance: 'Title only', title: 'Song B', artist: null, position: 0 },
      { dance: 'Artist only', title: 'Artist C', artist: null, position: 0 },
    ]);
    expect(await columns()).not.toContain('song');
    expect(await columns()).not.toContain('artist');
    expect(await allQuery('SELECT * FROM personal_data.choreography_favorite_songs')).toEqual([]);
  });
});

describe('song music metadata migration', () => {
  it('adds the metadata columns without touching existing songs and can run again', async () => {
    await open();
    await runQuery(
      "INSERT INTO choreographies (name, level_id) VALUES ('Dance', (SELECT id FROM levels LIMIT 1))",
    );
    await runQuery(
      "INSERT INTO choreography_songs (choreography_id, title) SELECT id, 'Song' FROM choreographies",
    );

    // Simulate a database from before the migration.
    await runQuery('DROP INDEX choreography_songs_genre');
    await runQuery('ALTER TABLE choreography_songs DROP COLUMN genre_id');
    await runQuery('ALTER TABLE choreography_songs DROP COLUMN bpm');
    await runQuery('ALTER TABLE choreography_songs DROP COLUMN length_seconds');
    await runQuery('DROP TABLE genres');
    await runQuery("DELETE FROM schema_migrations WHERE id = '017_add_song_music_metadata'");

    await runChoreographyMigrations();
    await runQuery("DELETE FROM schema_migrations WHERE id = '017_add_song_music_metadata'");
    await runChoreographyMigrations();

    expect(
      await allQuery('SELECT title, bpm, length_seconds, genre_id FROM choreography_songs'),
    ).toEqual([{ title: 'Song', bpm: null, length_seconds: null, genre_id: null }]);
    expect(await allQuery('SELECT * FROM genres')).toEqual([]);
  });
});
