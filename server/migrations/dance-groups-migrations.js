import { allQuery, getQuery, runQuery } from '../scripts/db.js';

const dbName = 'danceGroups';

const learnedChoreographiesViewSql = `
  CREATE VIEW learned_choreographies AS
  SELECT
    dg.id as dance_group_id,
    dg.name as dance_group_name,
    sc.choreography_id,
    COUNT(DISTINCT CASE
      WHEN (s.session_date IS NULL OR (s.session_date || ' 23:59:59') < datetime('now', '+2 hours'))
      THEN s.id
    END) as times_danced,
    MIN(s.session_date) as first_learned_date,
    MAX(s.session_date) as last_danced_date
  FROM dance_groups dg
  LEFT JOIN dance_courses dc ON dg.id = dc.dance_group_id
  LEFT JOIN sessions s ON dc.id = s.dance_course_id
  LEFT JOIN session_choreographies sc ON s.id = sc.session_id
  WHERE sc.choreography_id IS NOT NULL
  GROUP BY dg.id, sc.choreography_id
`;

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

async function ensureColumnExists(tableName, columnName, columnDefinition) {
  const columns = await allQuery(`PRAGMA table_info(${tableName})`, [], dbName);
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    await runQuery(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
      [],
      dbName,
    );
  }
}

const migrations = [
  {
    id: '001_create_dance_groups_core_schema',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS dance_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS dance_courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dance_group_id INTEGER NOT NULL,
          semester TEXT NOT NULL,
          start_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dance_group_id) REFERENCES dance_groups(id) ON DELETE CASCADE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dance_course_id INTEGER NOT NULL,
          session_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dance_course_id) REFERENCES dance_courses(id) ON DELETE CASCADE
        )`,
        [],
        dbName,
      );

      await runQuery(
        `CREATE TABLE IF NOT EXISTS session_choreographies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          choreography_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
          UNIQUE(session_id, choreography_id)
        )`,
        [],
        dbName,
      );
    },
  },
  {
    id: '002_add_group_levels_table',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS group_levels (
          dance_group_id INTEGER NOT NULL,
          level TEXT NOT NULL,
          PRIMARY KEY (dance_group_id, level),
          FOREIGN KEY (dance_group_id) REFERENCES dance_groups(id) ON DELETE CASCADE
        )`,
        [],
        dbName,
      );
    },
  },
  {
    id: '003_add_dance_course_playlist_urls',
    up: async () => {
      await ensureColumnExists('dance_courses', 'youtube_playlist_url', 'TEXT');
      await ensureColumnExists('dance_courses', 'copperknob_list_url', 'TEXT');
      await ensureColumnExists('dance_courses', 'spotify_playlist_url', 'TEXT');
    },
  },
  {
    id: '004_refresh_learned_choreographies_view',
    up: async () => {
      await runQuery(`DROP VIEW IF EXISTS learned_choreographies`, [], dbName);
      await runQuery(learnedChoreographiesViewSql, [], dbName);
    },
  },
  {
    id: '005_add_trainers_and_course_trainer_relation',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS trainers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        [],
        dbName,
      );

      await ensureColumnExists('dance_courses', 'trainer_id', 'INTEGER');
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_dance_courses_trainer_id ON dance_courses(trainer_id)`,
        [],
        dbName,
      );
    },
  },
  {
    id: '006_add_group_max_level_value_and_backfill',
    up: async () => {
      await ensureColumnExists('dance_groups', 'max_group_level_value', 'INTEGER');

      const levelRows = await allQuery(
        `SELECT UPPER(name) AS name_upper, value
         FROM levels
         WHERE value IS NOT NULL`,
        [],
        'choreography',
      );

      const levelValueByName = new Map(
        levelRows.map((row) => [String(row.name_upper), Number(row.value)]),
      );

      const groupLevelRows = await allQuery(
        `SELECT dance_group_id, level
         FROM group_levels
         ORDER BY dance_group_id ASC`,
        [],
        dbName,
      );

      const maxValueByGroup = new Map();

      for (const row of groupLevelRows) {
        const danceGroupId = Number(row.dance_group_id);
        const levelNameUpper = String(row.level || '').trim().toUpperCase();
        if (!levelNameUpper) {
          continue;
        }

        const value = levelValueByName.get(levelNameUpper);
        if (!Number.isFinite(value)) {
          continue;
        }

        const currentMax = maxValueByGroup.get(danceGroupId);
        if (!Number.isFinite(currentMax) || value > currentMax) {
          maxValueByGroup.set(danceGroupId, value);
        }
      }

      for (const [danceGroupId, maxValue] of maxValueByGroup.entries()) {
        await runQuery(
          `UPDATE dance_groups
           SET max_group_level_value = ?
           WHERE id = ? AND max_group_level_value IS NULL`,
          [maxValue, danceGroupId],
          dbName,
        );
      }
    },
  },
  {
    id: '007_drop_group_levels_table',
    up: async () => {
      await runQuery(`DROP TABLE IF EXISTS group_levels`, [], dbName);
    },
  },
];

export async function runDanceGroupsMigrations() {
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
