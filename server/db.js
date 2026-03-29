import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databases = {
  choreography: path.join(__dirname, 'line_dance.db'),
  danceGroups: path.join(__dirname, 'dance_groups.db'),
};

let dbConnections = {};

export function getDatabase(name = 'choreography') {
  if (!dbConnections[name]) {
    const dbPath = databases[name];
    if (!dbPath) {
      throw new Error(`Unknown database: ${name}`);
    }
    
    dbConnections[name] = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`Error connecting to ${name} database:`, err);
      } else {
        console.log(`Connected to ${name} database`);
      }
    });
    dbConnections[name].configure('busyTimeout', 5000);
  }
  return dbConnections[name];
}
export function runQuery(query, params = [], dbName = 'choreography') {
  return new Promise((resolve, reject) => {
    const db = getDatabase(dbName);
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery(query, params = [], dbName = 'choreography') {
  return new Promise((resolve, reject) => {
    const db = getDatabase(dbName);
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(query, params = [], dbName = 'choreography') {
  return new Promise((resolve, reject) => {
    const db = getDatabase(dbName);
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function setDatabaseConnection(name, db) {
  dbConnections[name] = db;
}

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    const dbNames = Object.keys(dbConnections);
    let closedCount = 0;
    let hasError = false;

    if (dbNames.length === 0) {
      resolve();
      return;
    }

    dbNames.forEach((name) => {
      const db = dbConnections[name];
      if (db) {
        db.close((err) => {
          if (err && !hasError) {
            hasError = true;
            reject(err);
          } else {
            closedCount++;
            console.log(`Closed ${name} database`);
            if (closedCount === dbNames.length) {
              dbConnections = {};
              resolve();
            }
          }
        });
      } else {
        closedCount++;
        if (closedCount === dbNames.length) {
          resolve();
        }
      }
    });
  });
}
