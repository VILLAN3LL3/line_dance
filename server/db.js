import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'line_dance.db');

let db = null;

export function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
    db.configure('busyTimeout', 5000);
  }
  return db;
}

export function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
