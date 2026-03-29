import sqlite3 from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initializeDanceGroupsDatabase() {
  const dbPath = path.join(__dirname, 'dance_groups.db');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });

  let completedQueries = 0;
  const totalQueries = 7;

  const checkComplete = () => {
    completedQueries++;
    if (completedQueries === totalQueries) {
      console.log('Dance groups database initialized successfully!');
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('Database connection closed');
      });
    }
  };

  // Create dance_groups table
  db.run(`
    CREATE TABLE IF NOT EXISTS dance_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating dance_groups table:', err);
    else console.log('Created dance_groups table');
    checkComplete();
  });

  // Create dance_courses table
  db.run(`
    CREATE TABLE IF NOT EXISTS dance_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dance_group_id INTEGER NOT NULL,
      semester TEXT NOT NULL,
      start_date DATE,
       youtube_playlist_url TEXT,
       copperknob_list_url TEXT,
       spotify_playlist_url TEXT,
       trainer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dance_group_id) REFERENCES dance_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('Error creating dance_courses table:', err);
    else console.log('Created dance_courses table');
    checkComplete();
  });

  // Create trainers table
  db.run(`
    CREATE TABLE IF NOT EXISTS trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating trainers table:', err);
    else console.log('Created trainers table');
    checkComplete();
  });

  // Create sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dance_course_id INTEGER NOT NULL,
      session_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dance_course_id) REFERENCES dance_courses(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating sessions table:', err);
    else console.log('Created sessions table');
    checkComplete();
  });

  // Create session_choreographies junction table (n:n)
  db.run(`
    CREATE TABLE IF NOT EXISTS session_choreographies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      choreography_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      UNIQUE(session_id, choreography_id)
    )
  `, (err) => {
    if (err) console.error('Error creating session_choreographies table:', err);
    else console.log('Created session_choreographies table');
    checkComplete();
  });

  // Create group_levels junction table (n:n)
  db.run(`
    CREATE TABLE IF NOT EXISTS group_levels (
      dance_group_id INTEGER NOT NULL,
      level TEXT NOT NULL,
      PRIMARY KEY (dance_group_id, level),
      FOREIGN KEY (dance_group_id) REFERENCES dance_groups(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating group_levels table:', err);
    else console.log('Created group_levels table');
    checkComplete();
  });

  // Create learned_choreographies view
  db.run(`DROP VIEW IF EXISTS learned_choreographies`, (err) => {
    if (err && !err.message.includes('no such view')) {
      console.error('Error dropping learned_choreographies view:', err);
    }
  });

  db.run(`
    CREATE VIEW learned_choreographies AS
    SELECT 
      dg.id as dance_group_id,
      dg.name as dance_group_name,
      sc.choreography_id,
      COUNT(DISTINCT CASE WHEN (s.session_date IS NULL OR (s.session_date || ' 23:59:59') < datetime('now', '+2 hours')) THEN s.id END) as times_danced,
      MIN(s.session_date) as first_learned_date,
      MAX(s.session_date) as last_danced_date
    FROM dance_groups dg
    LEFT JOIN dance_courses dc ON dg.id = dc.dance_group_id
    LEFT JOIN sessions s ON dc.id = s.dance_course_id
    LEFT JOIN session_choreographies sc ON s.id = sc.session_id
    WHERE sc.choreography_id IS NOT NULL
    GROUP BY dg.id, sc.choreography_id
  `, (err) => {
    if (err) console.error('Error creating learned_choreographies view:', err);
    else console.log('Created learned_choreographies view');
    checkComplete();
  });
}

initializeDanceGroupsDatabase();
