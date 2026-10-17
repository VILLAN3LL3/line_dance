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

async function seedDefaultBaseStepFigures() {
  const figures = await allQuery('SELECT id FROM step_figures WHERE LOWER(name) IN (?, ?, ?, ?)', [
    'hip bump',
    'hip sway',
    'kick',
    'run',
  ]);
  if (figures.length === 0) {
    return;
  }
  await runQuery(
    `INSERT OR IGNORE INTO group_base_step_figures (dance_group_id, step_figure_id)
     SELECT dance_groups.id, defaults.id FROM dance_groups
     CROSS JOIN (${figures.map(() => 'SELECT ? AS id').join(' UNION ALL ')}) AS defaults`,
    figures.map((figure) => figure.id),
    dbName,
  );
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
        const levelNameUpper = String(row.level || '')
          .trim()
          .toUpperCase();
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

      if (maxValueByGroup.size > 0) {
        const values = [...maxValueByGroup.entries()];
        await runQuery(
          `UPDATE dance_groups
           SET max_group_level_value = CASE id ${values.map(() => 'WHEN ? THEN ?').join(' ')} END
           WHERE id IN (${values.map(() => '?').join(',')}) AND max_group_level_value IS NULL`,
          [...values.flat(), ...maxValueByGroup.keys()],
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
  {
    id: '008_add_session_comment',
    up: async () => {
      await ensureColumnExists('sessions', 'comment', 'TEXT');
    },
  },
  {
    id: '009_add_group_base_step_figures',
    up: async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS group_base_step_figures (
          dance_group_id INTEGER NOT NULL,
          step_figure_id INTEGER NOT NULL,
          PRIMARY KEY (dance_group_id, step_figure_id),
          FOREIGN KEY (dance_group_id) REFERENCES dance_groups(id) ON DELETE CASCADE
        )`,
        [],
        dbName,
      );

      await seedDefaultBaseStepFigures();
    },
  },
  {
    id: '010_add_course_domain_id',
    up: async () => {
      await ensureColumnExists('dance_courses', 'course_id', 'INTEGER');
      await runQuery(
        `UPDATE dance_courses
         SET course_id = id
         WHERE course_id IS NULL`,
        [],
        dbName,
      );
      await runQuery(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_dance_courses_course_id
         ON dance_courses(course_id)
         WHERE course_id IS NOT NULL`,
        [],
        dbName,
      );
    },
  },
  {
    id: '011_add_course_name',
    up: async () => {
      await ensureColumnExists('dance_courses', 'name', 'TEXT');
    },
  },
  {
    id: '012_seed_missing_group_base_step_figures',
    up: async () => {
      await seedDefaultBaseStepFigures();
    },
  },
];

migrations.push(
  {
    id: '013_add_session_choreography_repetitions',
    up: async () => {
      await runQuery(
        'ALTER TABLE session_choreographies ADD COLUMN is_new INTEGER NOT NULL DEFAULT 1',
        [],
        dbName,
      );
      await runQuery(
        'ALTER TABLE session_choreographies ADD COLUMN repeat_source_id INTEGER',
        [],
        dbName,
      );
      await runQuery(
        'ALTER TABLE session_choreographies ADD COLUMN auto_repeat INTEGER NOT NULL DEFAULT 0',
        [],
        dbName,
      );
      await runQuery(
        `UPDATE session_choreographies AS current SET is_new = 0
       WHERE EXISTS (
         SELECT 1 FROM session_choreographies earlier
         JOIN sessions earlier_session ON earlier_session.id = earlier.session_id
         JOIN sessions current_session ON current_session.id = current.session_id
         WHERE earlier.choreography_id = current.choreography_id
           AND earlier_session.dance_course_id = current_session.dance_course_id
           AND (earlier_session.session_date < current_session.session_date
             OR (earlier_session.session_date = current_session.session_date
               AND earlier_session.id < current_session.id))
       )`,
        [],
        dbName,
      );
      await runQuery(
        'CREATE INDEX session_choreographies_repeat_source ON session_choreographies (repeat_source_id)',
        [],
        dbName,
      );
    },
  },
  {
    id: '014_backfill_planned_session_repetitions',
    up: async () => {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const plannedRepetitions = `WITH ordered_sessions AS (
      SELECT id, dance_course_id, session_date,
             ROW_NUMBER() OVER (PARTITION BY dance_course_id ORDER BY session_date, id) AS position
      FROM sessions
    ), planned_repetitions AS (
      SELECT source.id AS source_id, source.choreography_id, target.id AS target_id,
             origin.position AS source_position
      FROM session_choreographies source
      JOIN ordered_sessions origin ON origin.id = source.session_id
      JOIN ordered_sessions target ON target.dance_course_id = origin.dance_course_id
        AND target.position BETWEEN origin.position + 1 AND origin.position + 2
      WHERE source.is_new = 1 AND source.repeat_source_id IS NULL AND source.auto_repeat = 0
        AND substr(target.session_date, 1, 10) >= ?
    )`;
      await runQuery(
        `${plannedRepetitions}
       INSERT OR IGNORE INTO session_choreographies
         (session_id, choreography_id, is_new, repeat_source_id, auto_repeat)
       SELECT target_id, choreography_id, 0, source_id, 0 FROM planned_repetitions
       ORDER BY source_position DESC, source_id`,
        [today],
        dbName,
      );
      await runQuery(
        `${plannedRepetitions}
       UPDATE session_choreographies SET auto_repeat = 1
       WHERE id IN (SELECT source_id FROM planned_repetitions)`,
        [today],
        dbName,
      );
    },
  },
);

async function applyMigration(migration) {
  const alreadyApplied = await hasMigration(migration.id);
  if (alreadyApplied) {
    return;
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

export async function runDanceGroupsMigrations() {
  await ensureMigrationTable();
  await migrations.reduce(
    (previous, migration) => previous.then(() => applyMigration(migration)),
    Promise.resolve(),
  );
}
