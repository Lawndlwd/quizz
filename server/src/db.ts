import path from 'node:path';
import { type Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'quizz.db')
  : path.join(process.cwd(), '..', 'quizz.db');

export let db: Database;

export async function initDb(): Promise<void> {
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
}
