import { allQuery, getQuery, runQuery } from '../scripts/db.js';

const dbName = 'choreography';

async function ensureMigrationTable() {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    [],
    dbName,
  );
}

async function hasMigration(id) {
  const row = await getQuery(`SELECT id FROM schema_migrations WHERE id = ?`, [id], dbName);
  return Boolean(row);
}

const migrations = [
  {
    id: '001_create_choreography_core_schema',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS levels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          value INTEGER NOT NULL DEFAULT 0
        )`,
        [],
        dbName,
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
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
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
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS step_figures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
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
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_tags.tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_tags.choreography_tags (
          choreography_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, tag_id)
        )`,
        [],
        dbName,
      );
    },
  },
  {
    id: '002_seed_default_levels',
    up: async () => {
      const valueColumn = await getQuery(
        `SELECT name FROM pragma_table_info('levels') WHERE name = 'value'`,
        [],
        dbName,
      );

      const defaultLevels = [
        ['UNKNOWN', 0],
        ['ABSOLUTE BEGINNER', 10],
        ['EASY BEGINNER', 20],
        ['BEGINNER', 30],
        ['HIGH BEGINNER', 40],
        ['LOW IMPROVER', 50],
        ['EASY IMPROVER', 60],
        ['IMPROVER', 70],
        ['HIGH IMPROVER', 80],
        ['LOW INTERMEDIATE', 90],
        ['EASY INTERMEDIATE', 100],
        ['INTERMEDIATE', 110],
        ['HIGH INTERMEDIATE', 120],
        ['LOW ADVANCED', 130],
        ['EASY ADVANCED', 140],
        ['ADVANCED', 150],
        ['HIGH ADVANCED', 160],
      ];

      for (const [name, value] of defaultLevels) {
        const existing = await getQuery(
          `SELECT id FROM levels WHERE UPPER(name) = UPPER(?) LIMIT 1`,
          [name],
          dbName,
        );

        if (existing) {
          continue;
        }

        if (valueColumn) {
          await runQuery(
            `INSERT OR IGNORE INTO levels (name, value) VALUES (?, ?)`,
            [name, value],
            dbName,
          );
        } else {
          await runQuery(`INSERT OR IGNORE INTO levels (name) VALUES (?)`, [name], dbName);
        }
      }
    },
  },
  {
    id: '003_ensure_personal_tags_schema_and_backfill',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_tags.tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS personal_tags.choreography_tags (
          choreography_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (choreography_id, tag_id)
        )`,
        [],
        dbName,
      );

      const legacyTagsTable = await getQuery(
        `SELECT name FROM main.sqlite_master WHERE type = 'table' AND name = 'tags'`,
        [],
        dbName,
      );
      const legacyJunctionTable = await getQuery(
        `SELECT name FROM main.sqlite_master WHERE type = 'table' AND name = 'choreography_tags'`,
        [],
        dbName,
      );

      if (legacyTagsTable && legacyJunctionTable) {
        await runQuery(
          `INSERT OR IGNORE INTO personal_tags.tags (id, name)
           SELECT id, name FROM main.tags`,
          [],
          dbName,
        );

        await runQuery(
          `INSERT OR IGNORE INTO personal_tags.choreography_tags (choreography_id, tag_id)
           SELECT choreography_id, tag_id FROM main.choreography_tags`,
          [],
          dbName,
        );
      }
    },
  },
  {
    id: '004_add_level_value_and_backfill',
    up: async () => {
      const valueColumn = await getQuery(
        `SELECT name FROM pragma_table_info('levels') WHERE name = 'value'`,
        [],
        dbName,
      );

      if (!valueColumn) {
        await runQuery(`ALTER TABLE levels ADD COLUMN value INTEGER`, [], dbName);
      }

      const defaults = [
        ['Beginner', 10],
        ['Intermediate', 20],
        ['Advanced', 30],
        ['Experienced', 40],
      ];

      for (const [name, value] of defaults) {
        await runQuery(
          `UPDATE levels SET value = ? WHERE name = ? AND value IS NULL`,
          [value, name],
          dbName,
        );
      }

      const maxValueRow = await getQuery(
        `SELECT COALESCE(MAX(value), 0) AS max_value FROM levels WHERE value IS NOT NULL`,
        [],
        dbName,
      );

      let nextValue = Number(maxValueRow?.max_value || 0) + 10;
      const levelsWithoutValue = await allQuery(
        `SELECT id FROM levels WHERE value IS NULL ORDER BY id ASC`,
        [],
        dbName,
      );

      for (const level of levelsWithoutValue) {
        await runQuery(`UPDATE levels SET value = ? WHERE id = ?`, [nextValue, level.id], dbName);
        nextValue += 10;
      }
    },
  },
  {
    id: '005_ensure_canonical_level_catalog',
    up: async () => {
      const valueColumn = await getQuery(
        `SELECT name FROM pragma_table_info('levels') WHERE name = 'value'`,
        [],
        dbName,
      );

      if (!valueColumn) {
        await runQuery(`ALTER TABLE levels ADD COLUMN value INTEGER`, [], dbName);
      }

      const canonicalLevels = [
        ['UNKNOWN', 0],
        ['ABSOLUTE BEGINNER', 10],
        ['EASY BEGINNER', 20],
        ['BEGINNER', 30],
        ['HIGH BEGINNER', 40],
        ['LOW IMPROVER', 50],
        ['EASY IMPROVER', 60],
        ['IMPROVER', 70],
        ['HIGH IMPROVER', 80],
        ['LOW INTERMEDIATE', 90],
        ['EASY INTERMEDIATE', 100],
        ['INTERMEDIATE', 110],
        ['HIGH INTERMEDIATE', 120],
        ['LOW ADVANCED', 130],
        ['EASY ADVANCED', 140],
        ['ADVANCED', 150],
        ['HIGH ADVANCED', 160],
      ];

      for (const [name, value] of canonicalLevels) {
        const existing = await getQuery(
          `SELECT id FROM levels WHERE UPPER(name) = UPPER(?) ORDER BY id ASC LIMIT 1`,
          [name],
          dbName,
        );

        if (existing) {
          await runQuery(
            `UPDATE levels SET name = ?, value = ? WHERE id = ?`,
            [name, value, existing.id],
            dbName,
          );
        } else {
          await runQuery(`INSERT INTO levels (name, value) VALUES (?, ?)`, [name, value], dbName);
        }
      }
    },
  },
  {
    id: '006_add_step_figure_hierarchy',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS step_figure_components (
          parent_step_figure_id INTEGER NOT NULL,
          child_step_figure_id INTEGER NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (parent_step_figure_id, child_step_figure_id),
          FOREIGN KEY (parent_step_figure_id) REFERENCES step_figures(id) ON DELETE CASCADE,
          FOREIGN KEY (child_step_figure_id) REFERENCES step_figures(id) ON DELETE CASCADE,
          CHECK (parent_step_figure_id != child_step_figure_id)
        )`,
        [],
        dbName,
      );
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
      await runQuery(`INSERT INTO schema_migrations (id) VALUES (?)`, [migration.id], dbName);
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
