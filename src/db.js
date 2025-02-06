import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db = null;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: './hackathon.db',
    driver: sqlite3.Database
  });
  
  return db;
}

export async function initDb() {
  const db = await getDb();
  
  // creating the users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      badge_code TEXT UNIQUE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // creating the activities tabel
  await db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL
    )
  `);
  
  // scans table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_id INTEGER NOT NULL,
      scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (activity_id) REFERENCES activities (id)
    )
  `);
  
  // making triggers to update updated_at
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_user_timestamp 
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
  
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_user_timestamp_on_scan
    AFTER INSERT ON scans
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.user_id;
    END;
  `);
}