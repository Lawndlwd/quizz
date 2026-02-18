import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { config, saveConfig } from '../config';
import { requireAdmin } from '../middleware';
import { DbQuiz, DbQuestion, DbSession, QuizImportPayload } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const adminRouter = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────

adminRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (username === config.adminUsername && password === config.adminPassword) {
    const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '8h' });
    res.cookie('adminToken', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken');
  res.json({ ok: true });
});

adminRouter.get('/me', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

// ─── Config ───────────────────────────────────────────────────────────────────

adminRouter.get('/config', requireAdmin, (_req, res) => {
  const { adminPassword: _p, jwtSecret: _s, ...safe } = config;
  res.json(safe);
});

adminRouter.put('/config', requireAdmin, (req: Request, res: Response) => {
  const allowed = [
    'questionTimeSec', 'defaultBaseScore', 'speedBonuses', 'defaultSpeedBonus',
    'maxPlayersPerSession', 'showLeaderboardAfterQuestion', 'allowLateJoin',
    'adminUsername', 'adminPassword'
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (config as Record<string, unknown>)[key] = req.body[key];
    }
  }
  saveConfig(config);
  res.json({ ok: true });
});

// ─── Quizzes ──────────────────────────────────────────────────────────────────

adminRouter.get('/quizzes', requireAdmin, (_req, res) => {
  const quizzes = db.prepare(`
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all() as DbQuiz[];
  res.json(quizzes);
});

adminRouter.get('/quizzes/:id', requireAdmin, (req: Request, res: Response) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id) as DbQuiz | undefined;
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(req.params.id) as DbQuestion[];
  res.json({ ...quiz, questions: questions.map(q => ({ ...q, options: JSON.parse(q.options) })) });
});

adminRouter.post('/quizzes', requireAdmin, (req: Request, res: Response) => {
  const body = req.body as QuizImportPayload;
  if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return res.status(400).json({ error: 'title and at least one question are required' });
  }

  const insertQuiz = db.prepare('INSERT INTO quizzes (title, description) VALUES (?, ?)');
  const insertQ = db.prepare(
    'INSERT INTO questions (quiz_id, text, options, correct_index, base_score, time_sec, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    const result = insertQuiz.run(body.title, body.description ?? '');
    const quizId = result.lastInsertRowid;
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];
      insertQ.run(
        quizId,
        q.text,
        JSON.stringify(q.options),
        q.correctIndex,
        q.baseScore ?? config.defaultBaseScore,
        q.timeSec ?? config.questionTimeSec,
        i
      );
    }
    return quizId;
  });

  const quizId = run();
  res.status(201).json({ id: quizId });
});

adminRouter.delete('/quizzes/:id', requireAdmin, (req: Request, res: Response) => {
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

adminRouter.post('/sessions', requireAdmin, (req: Request, res: Response) => {
  const { quizId } = req.body as { quizId: number };
  const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  let pin = generatePin();
  while (db.prepare("SELECT id FROM sessions WHERE pin = ? AND status != 'finished'").get(pin)) {
    pin = generatePin();
  }

  const result = db.prepare(
    "INSERT INTO sessions (quiz_id, pin, status) VALUES (?, ?, 'waiting')"
  ).run(quizId, pin);

  res.status(201).json({ id: result.lastInsertRowid, pin });
});

adminRouter.get('/sessions', requireAdmin, (_req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, q.title as quiz_title,
      (SELECT COUNT(*) FROM players p WHERE p.session_id = s.id) as player_count
    FROM sessions s
    JOIN quizzes q ON q.id = s.quiz_id
    ORDER BY s.created_at DESC
  `).all();
  res.json(sessions);
});

adminRouter.get('/sessions/:id', requireAdmin, (req: Request, res: Response) => {
  const session = db.prepare(`
    SELECT s.*, q.title as quiz_title
    FROM sessions s JOIN quizzes q ON q.id = s.quiz_id
    WHERE s.id = ?
  `).get(req.params.id) as DbSession | undefined;
  if (!session) return res.status(404).json({ error: 'Not found' });

  const players = db.prepare(
    'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC'
  ).all(req.params.id);

  const questions = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index'
  ).all(session.quiz_id) as DbQuestion[];

  const answers = db.prepare(
    'SELECT a.*, p.username FROM answers a JOIN players p ON p.id = a.player_id WHERE a.session_id = ?'
  ).all(req.params.id);

  res.json({
    session,
    players,
    questions: questions.map(q => ({ ...q, options: JSON.parse(q.options) })),
    answers
  });
});
