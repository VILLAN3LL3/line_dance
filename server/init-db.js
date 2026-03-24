import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initializeDatabase() {
  const dbPath = path.join(__dirname, 'line_dance.db');
  
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
      console.log('Database initialized successfully!');
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('Database connection closed');
      });
    }
  };

  // Create choreographies table
  db.run(`
    CREATE TABLE IF NOT EXISTS choreographies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      step_sheet_link TEXT,
      count INTEGER,
      wall_count INTEGER,
      level TEXT NOT NULL,
      creation_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating choreographies table:', err);
    else checkComplete();
  });

  // Create authors table
  db.run(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `, (err) => {
    if (err) console.error('Error creating authors table:', err);
    else checkComplete();
  });

  // Create junction table for choreographies and authors
  db.run(`
    CREATE TABLE IF NOT EXISTS choreography_authors (
      choreography_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      PRIMARY KEY (choreography_id, author_id),
      FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id)
    )
  `, (err) => {
    if (err) console.error('Error creating choreography_authors table:', err);
    else checkComplete();
  });

  // Create step figures table
  db.run(`
    CREATE TABLE IF NOT EXISTS step_figures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `, (err) => {
    if (err) console.error('Error creating step_figures table:', err);
    else checkComplete();
  });

  // Create junction table for choreographies and step figures
  db.run(`
    CREATE TABLE IF NOT EXISTS choreography_step_figures (
      choreography_id INTEGER NOT NULL,
      step_figure_id INTEGER NOT NULL,
      PRIMARY KEY (choreography_id, step_figure_id),
      FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
      FOREIGN KEY (step_figure_id) REFERENCES step_figures(id)
    )
  `, (err) => {
    if (err) console.error('Error creating choreography_step_figures table:', err);
    else checkComplete();
  });

  // Create tags table
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `, (err) => {
    if (err) console.error('Error creating tags table:', err);
    else checkComplete();
  });

  // Create junction table for choreographies and tags
  db.run(`
    CREATE TABLE IF NOT EXISTS choreography_tags (
      choreography_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (choreography_id, tag_id),
      FOREIGN KEY (choreography_id) REFERENCES choreographies(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    )
  `, (err) => {
    if (err) console.error('Error creating choreography_tags table:', err);
    else checkComplete();
  });
}

initializeDatabase();
