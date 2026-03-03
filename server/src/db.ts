import fs from 'node:fs';
import path from 'node:path';
import { type Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

// All persistent data lives in DATA_DIR (Docker) or <project-root>/data/ (local dev)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
const DB_PATH = path.join(dataDir, 'quizz.db');

// ── Migration: move DB from old locations into the unified data dir ──────────
const OLD_DB_PATHS = [
  path.join(process.cwd(), '..', 'quizz.db'),  // <root>/quizz.db
];

function migrateDb(): void {
  if (fs.existsSync(DB_PATH)) return; // already in the right place
  fs.mkdirSync(dataDir, { recursive: true });

  for (const oldPath of OLD_DB_PATHS) {
    if (fs.existsSync(oldPath)) {
      // Move the main DB file + WAL/SHM sidecar files
      for (const suffix of ['', '-wal', '-shm']) {
        const src = oldPath + suffix;
        const dst = DB_PATH + suffix;
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          fs.unlinkSync(src);
        }
      }
      console.log(`[migrate] Moved database from ${oldPath} → ${DB_PATH}`);
      return;
    }
  }
}

migrateDb();

export let db: Database;

export async function initDb(): Promise<void> {
  fs.mkdirSync(dataDir, { recursive: true });
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  await db.run('PRAGMA journal_mode = WAL');
  await db.run('PRAGMA foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      options     TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      base_score  INTEGER NOT NULL DEFAULT 500,
      time_sec    INTEGER NOT NULL DEFAULT 20,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id                INTEGER NOT NULL REFERENCES quizzes(id),
      pin                    TEXT NOT NULL UNIQUE,
      status                 TEXT NOT NULL DEFAULT 'waiting',
      current_question_index INTEGER NOT NULL DEFAULT -1,
      created_at             TEXT NOT NULL DEFAULT (datetime('now')),
      started_at             TEXT,
      finished_at            TEXT
    );

    CREATE TABLE IF NOT EXISTS players (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      username    TEXT NOT NULL,
      total_score INTEGER NOT NULL DEFAULT 0,
      joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, username)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      session_id   INTEGER NOT NULL,
      question_id  INTEGER NOT NULL,
      chosen_index INTEGER NOT NULL,
      is_correct   INTEGER NOT NULL DEFAULT 0,
      score        INTEGER NOT NULL DEFAULT 0,
      answer_order INTEGER NOT NULL DEFAULT 0,
      answered_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_password_change TEXT
    );
  `);

  // Column migrations (safe to run multiple times)
  const columnMigrations = [
    `ALTER TABLE questions ADD COLUMN image_url TEXT`,
    `ALTER TABLE questions ADD COLUMN question_type TEXT NOT NULL DEFAULT 'multiple_choice'`,
    `ALTER TABLE questions ADD COLUMN correct_answer TEXT`,
    `ALTER TABLE answers ADD COLUMN chosen_text TEXT`,
  ];
  for (const sql of columnMigrations) {
    try {
      await db.run(sql);
    } catch {
      /* column already exists */
    }
  }

  // Migrate admin from config to database if needed
  const adminCount = await db.get('SELECT COUNT(*) as count FROM admins');
  if (adminCount.count === 0) {
    // Only create default admin if none exists
    const defaultAdmin = {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin',
    };

    // Always hash the password and create the admin record
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 12);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [
      defaultAdmin.username,
      hashedPassword,
    ]);
  }
}
