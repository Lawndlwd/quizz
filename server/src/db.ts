import fs from 'node:fs';
import path from 'node:path';
import { type Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { DbPlayer } from './types';

// All persistent data lives in DATA_DIR (Docker) or <project-root>/data/ (local dev)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
const DB_PATH = path.join(dataDir, 'quizz.db');

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

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_banned INTEGER NOT NULL DEFAULT 0,
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
    `ALTER TABLE questions ADD COLUMN correct_indices TEXT`,
    `ALTER TABLE answers ADD COLUMN chosen_indices TEXT`,
    `ALTER TABLE quizzes ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE quizzes ADD COLUMN owner_kind TEXT NOT NULL DEFAULT 'admin'`,
    `ALTER TABLE sessions ADD COLUMN hosted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE questions ADD COLUMN explanation TEXT`,
    `ALTER TABLE questions ADD COLUMN range_min INTEGER`,
    `ALTER TABLE questions ADD COLUMN range_max INTEGER`,
    `ALTER TABLE questions ADD COLUMN media_url TEXT`,
    `ALTER TABLE questions ADD COLUMN media_type TEXT`,
    `ALTER TABLE questions ADD COLUMN blanks TEXT`,
    `ALTER TABLE questions ADD COLUMN hotspot TEXT`,
    `ALTER TABLE quizzes ADD COLUMN cover_image TEXT`,
    `ALTER TABLE questions ADD COLUMN tags TEXT`,
    `ALTER TABLE questions ADD COLUMN geo TEXT`,
    `ALTER TABLE quizzes ADD COLUMN theme TEXT NOT NULL DEFAULT 'default'`,
    `ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN play_display_name TEXT`,
    `ALTER TABLE users ADD COLUMN play_avatar TEXT`,
    `ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE players ADD COLUMN avatar TEXT`,
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
    // Only create the initial super-admin if none exists yet.
    const username = process.env.ADMIN_USERNAME || 'admin';
    // Never seed a well-known password. Use ADMIN_PASSWORD when provided,
    // otherwise generate a strong random one and print it once so the
    // operator can log in and rotate it.
    const { randomBytes } = await import('node:crypto');
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = randomBytes(18).toString('base64url');
      console.warn(
        `\n[quizz] No ADMIN_PASSWORD set. Generated a one-time super-admin password:\n` +
          `        username: ${username}\n` +
          `        password: ${password}\n` +
          `        Log in and change it now; this will not be shown again.\n`,
      );
    }

    const { hashPassword } = await import('./passwords');
    const hashedPassword = await hashPassword(password);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [
      username,
      hashedPassword,
    ]);
  }
}

/** All players in a session, highest score first (shared leaderboard source). */
export async function getRankedPlayers(sessionId: number | string): Promise<DbPlayer[]> {
  return db.all<DbPlayer[]>(
    'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC',
    sessionId,
  );
}
