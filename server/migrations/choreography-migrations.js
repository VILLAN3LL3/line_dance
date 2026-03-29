import { getQuery, runQuery } from '../db.js';

const dbName = 'choreography';

async function ensureMigrationTable() {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    [],
    dbName
  );
}

async function hasMigration(id) {
  const row = await getQuery(
    `SELECT id FROM schema_migrations WHERE id = ?`,
    [id],
    dbName
  );
  return Boolean(row);
}

const migrations = [
  {
    id: '001_create_choreography_core_schema',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS levels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreographies (
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
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreography_authors (
          choreography_id INTEGER NOT NULL,
          author_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, author_id),
          FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES authors(id)
        )`,
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS step_figures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreography_step_figures (
          choreography_id INTEGER NOT NULL,
          step_figure_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, step_figure_id),
          FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
          FOREIGN KEY (step_figure_id) REFERENCES step_figures(id)
        )`,
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS choreography_tags (
          choreography_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, tag_id),
          FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id)
        )`,
        [],
        dbName
      );
    },
  },
  {
    id: '002_seed_default_levels',
    up: async () => {
      await runQuery(`INSERT OR IGNORE INTO levels (name) VALUES ('Beginner')`, [], dbName);
      await runQuery(`INSERT OR IGNORE INTO levels (name) VALUES ('Intermediate')`, [], dbName);
      await runQuery(`INSERT OR IGNORE INTO levels (name) VALUES ('Advanced')`, [], dbName);
      await runQuery(`INSERT OR IGNORE INTO levels (name) VALUES ('Experienced')`, [], dbName);
    },
  },
];

export async function runChoreographyMigrations() {
  await ensureMigrationTable();

  for (const migration of migrations) {
    const alreadyApplied = await hasMigration(migration.id);
    if (alreadyApplied) {
      continue;
    }

    await runQuery('BEGIN IMMEDIATE TRANSACTION', [], dbName);
    try {
      await migration.up();
      await runQuery(
        `INSERT INTO schema_migrations (id) VALUES (?)`,
        [migration.id],
        dbName
      );
      await runQuery('COMMIT', [], dbName);
      console.log(`Applied migration: ${migration.id}`);
    } catch (error) {
      await runQuery('ROLLBACK', [], dbName).catch(() => {
        // Best effort rollback if transaction state already changed by SQLite.
      });
      throw error;
    }
  }
}
