const Database = require('better-sqlite3');
const path = require('path');
const settings = require('../config/settings');

let db;

function getDb() {
  if (!db) {
    const dbPath = path.resolve(settings.db.path);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
