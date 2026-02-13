import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "vaanibill.db");
let dbPromise;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = open({ filename: dbPath, driver: sqlite3.Database }).then(async (db) => {
      await db.exec("PRAGMA journal_mode = WAL;");
      await db.exec("PRAGMA foreign_keys = ON;");
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          business_name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name_en TEXT NOT NULL,
          name_gu TEXT NOT NULL DEFAULT '',
          rate REAL NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(user_id, name_en),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          bill_number TEXT NOT NULL,
          total REAL NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(user_id, bill_number),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS bill_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          rate REAL NOT NULL,
          quantity REAL NOT NULL,
          total REAL NOT NULL,
          FOREIGN KEY(bill_id) REFERENCES bills(id) ON DELETE CASCADE
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
