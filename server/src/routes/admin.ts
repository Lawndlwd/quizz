import { type Request, type Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { saveAvatarsFromDataUrls } from '../avatars';
import { config, saveConfig } from '../config';
import { db } from '../db';
import { requireAdmin } from '../middleware';
import type { DbQuestion, DbQuiz, DbSession, QuizImportPayload } from '../types';

export const adminRouter = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────

adminRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };

  try {
    // Check database for admin
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare hashed password
    const bcrypt = await import('bcrypt');
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ username: admin.username, adminId: admin.id }, config.jwtSecret, {
      expiresIn: '7d',
    });

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken');
  res.json({ ok: true });
});

adminRouter.post('/change-password', requireAdmin, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, newUsername } = req.body as {
    currentPassword: string;
    newPassword?: string;
    newUsername?: string;
  };
  const adminId = (req as any).user.adminId; // From JWT

  if (!newPassword && !newUsername) {
    return res.status(400).json({ error: 'Nothing to change' });
  }

  try {
    // Get current admin
    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [adminId]);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const bcrypt = await import('bcrypt');
    const valid = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    // Update username if provided
    if (newUsername && newUsername !== admin.username) {
      await db.run('UPDATE admins SET username = ? WHERE id = ?', [newUsername, adminId]);
    }

    // Hash and update new password if provided
    if (newPassword) {
      const newHash = await bcrypt.hash(newPassword, 12);
      await db.run(
        'UPDATE admins SET password_hash = ?, last_password_change = datetime("now") WHERE id = ?',
        [newHash, adminId],
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Credential change error:', error);
    res.status(500).json({ error: 'Credential change failed' });
  }
});

adminRouter.get('/me', requireAdmin, async (req, res) => {
  const adminId = (req as any).user.adminId;
  const admin = await db.get('SELECT username FROM admins WHERE id = ?', [adminId]);
  res.json({ ok: true, username: admin?.username });
});

// ─── Config ───────────────────────────────────────────────────────────────────

adminRouter.get('/config', requireAdmin, (_req, res) => {
  const { ...safe } = config;
  res.json(safe);
});

adminRouter.put('/config', requireAdmin, (req: Request, res: Response) => {
  const allowed = [
    'appName',
    'appSubtitle',
    'questionTimeSec',
    'defaultBaseScore',
    'speedBonusMax',
    'speedBonusMin',
    'maxPlayersPerSession',
    'showLeaderboardAfterQuestion',
    'streakBonusEnabled',
    'streakMinimum',
    'streakBonusBase',
    'resultsAutoAdvanceSec',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (config as unknown as Record<string, unknown>)[key] = req.body[key];
    }
  }
  saveConfig(config);
  res.json({ ok: true });
});

// ─── Avatars (admin bulk upload) ────────────────────────────────────────────────

adminRouter.post('/avatars/bulk', requireAdmin, (req: Request, res: Response) => {
  const { dataUrls } = req.body as { dataUrls?: unknown };
  if (!Array.isArray(dataUrls) || dataUrls.length === 0) {
    return res.status(400).json({ error: 'dataUrls array is required' });
  }

  const urls = saveAvatarsFromDataUrls(dataUrls.filter((u): u is string => typeof u === 'string'));

  if (urls.length === 0) {
    return res.status(400).json({ error: 'No valid images provided' });
  }

  res.status(201).json({ urls });
});

// ─── Quizzes ──────────────────────────────────────────────────────────────────

adminRouter.get('/quizzes', requireAdmin, async (_req, res) => {
  const quizzes = await db.all<DbQuiz[]>(`
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `);
  res.json(quizzes);
});

adminRouter.get('/quizzes/:id', requireAdmin, async (req: Request, res: Response) => {
  const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const questions = await db.all<DbQuestion[]>(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
    req.params.id,
  );
  res.json({
    ...quiz,
    questions: questions.map((q: DbQuestion) => ({ ...q, options: JSON.parse(q.options) })),
  });
});

adminRouter.post('/quizzes', requireAdmin, async (req: Request, res: Response) => {
  const body = req.body as QuizImportPayload;
  if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return res.status(400).json({ error: 'title and at least one question are required' });
  }

  await db.run('BEGIN');
  try {
    const quizResult = await db.run(
      'INSERT INTO quizzes (title, description) VALUES (?, ?)',
      body.title,
      body.description ?? '',
    );
    const quizId = quizResult.lastID;
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];
      await db.run(
        'INSERT INTO questions (quiz_id, text, options, correct_index, base_score, time_sec, order_index, image_url, question_type, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        quizId,
        q.text,
        JSON.stringify(q.options),
        q.correctIndex,
        q.baseScore ?? config.defaultBaseScore,
        q.timeSec ?? config.questionTimeSec,
        i,
        q.imageUrl ?? null,
        q.questionType ?? 'multiple_choice',
        q.correctAnswer ?? null,
      );
    }
    await db.run('COMMIT');
    res.status(201).json({ id: quizId });
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
});

adminRouter.put('/quizzes/:id', requireAdmin, async (req: Request, res: Response) => {
  const body = req.body as QuizImportPayload;
  if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return res.status(400).json({ error: 'title and at least one question are required' });
  }

  const quiz = await db.get<DbQuiz>('SELECT id FROM quizzes WHERE id = ?', req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });

  await db.run('BEGIN');
  try {
    await db.run(
      'UPDATE quizzes SET title = ?, description = ? WHERE id = ?',
      body.title,
      body.description ?? '',
      req.params.id,
    );
    await db.run('DELETE FROM questions WHERE quiz_id = ?', req.params.id);
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];
      await db.run(
        'INSERT INTO questions (quiz_id, text, options, correct_index, base_score, time_sec, order_index, image_url, question_type, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        req.params.id,
        q.text,
        JSON.stringify(q.options),
        q.correctIndex,
        q.baseScore ?? config.defaultBaseScore,
        q.timeSec ?? config.questionTimeSec,
        i,
        q.imageUrl ?? null,
        q.questionType ?? 'multiple_choice',
        q.correctAnswer ?? null,
      );
    }
    await db.run('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
});

adminRouter.delete('/quizzes/:id', requireAdmin, async (req: Request, res: Response) => {
  // Delete sessions first (no ON DELETE CASCADE on sessions.quiz_id)
  await db.run('DELETE FROM sessions WHERE quiz_id = ?', req.params.id);
  await db.run('DELETE FROM quizzes WHERE id = ?', req.params.id);
  res.json({ ok: true });
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

adminRouter.post('/sessions', requireAdmin, async (req: Request, res: Response) => {
  const { quizId } = req.body as { quizId: number };
  const quiz = await db.get('SELECT id FROM quizzes WHERE id = ?', quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  let pin = generatePin();
  while (await db.get("SELECT id FROM sessions WHERE pin = ? AND status != 'finished'", pin)) {
    pin = generatePin();
  }

  const result = await db.run(
    "INSERT INTO sessions (quiz_id, pin, status) VALUES (?, ?, 'waiting')",
    quizId,
    pin,
  );

  res.status(201).json({ id: result.lastID, pin });
});

adminRouter.get('/sessions', requireAdmin, async (_req, res) => {
  const sessions = await db.all(`
    SELECT s.*, q.title as quiz_title,
      (SELECT COUNT(*) FROM players p WHERE p.session_id = s.id) as player_count
    FROM sessions s
    JOIN quizzes q ON q.id = s.quiz_id
    ORDER BY s.created_at DESC
  `);
  res.json(sessions);
});

adminRouter.post('/sessions/:id/force-end', requireAdmin, async (req: Request, res: Response) => {
  const session = await db.get<{ id: number; status: string }>(
    'SELECT id, status FROM sessions WHERE id = ?',
    req.params.id,
  );
  if (!session) return res.status(404).json({ error: 'Not found' });
  if (session.status === 'finished') return res.json({ ok: true, already: true });
  await db.run(
    "UPDATE sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ?",
    req.params.id,
  );
  res.json({ ok: true });
});

adminRouter.get('/sessions/:id', requireAdmin, async (req: Request, res: Response) => {
  const session = await db.get<DbSession>(
    `SELECT s.*, q.title as quiz_title
    FROM sessions s JOIN quizzes q ON q.id = s.quiz_id
    WHERE s.id = ?`,
    req.params.id,
  );
  if (!session) return res.status(404).json({ error: 'Not found' });

  const players = await db.all(
    'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC',
    req.params.id,
  );

  const questions = await db.all<DbQuestion[]>(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
    session.quiz_id,
  );

  const answers = await db.all(
    'SELECT a.*, p.username FROM answers a JOIN players p ON p.id = a.player_id WHERE a.session_id = ?',
    req.params.id,
  );

  res.json({
    session,
    players,
    questions: questions.map((q: DbQuestion) => ({ ...q, options: JSON.parse(q.options) })),
    answers,
  });
});
