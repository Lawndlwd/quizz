import bcrypt from 'bcrypt';
import { type Request, type Response, Router } from 'express';
import { saveAvatarsFromDataUrls } from '../avatars';
import { config, saveConfig, toPublicConfig } from '../config';
import { db, getRankedPlayers } from '../db';
import { getRequestUser, requireAuth, requireSuperAdmin, signToken } from '../middleware';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../passwords';
import { terminateSessionById } from '../socket/sessionLifecycle';
import type {
  DbQuestion,
  DbQuiz,
  DbSession,
  JwtPayload,
  QuizImportPayload,
  QuizQuestion,
} from '../types';
import {
  normalizeImageUrl,
  normalizeOptionalText,
  normalizeTags,
  parseQuestionRow,
} from '../utils';

export const adminRouter = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Super admin login: env credentials first, then admins table fallback.
// Regular users authenticate via /api/auth/login (see routes/auth.ts).
adminRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };

  try {
    const envUser = process.env.ADMIN_USERNAME || 'admin';
    const envPass = process.env.ADMIN_PASSWORD;
    if (envPass && username === envUser && password === envPass) {
      const payload: JwtPayload = { id: 0, role: 'super_admin', username: envUser };
      const token = signToken(payload);
      return res.json({ token });
    }

    const admin = await db.get<{ id: number; username: string; password_hash: string }>(
      'SELECT id, username, password_hash FROM admins WHERE username = ?',
      username,
    );
    if (admin && (await bcrypt.compare(password, admin.password_hash))) {
      const payload: JwtPayload = { id: 0, role: 'super_admin', username: admin.username };
      const token = signToken(payload);
      return res.json({ token });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken');
  res.json({ ok: true });
});

adminRouter.get('/me', requireAuth, async (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role === 'super_admin') {
    return res.json({
      ok: true,
      role: 'super_admin',
      username: user.username,
      isSuperAdmin: true,
    });
  }
  const row = await db.get<{ username: string }>('SELECT username FROM users WHERE id = ?', [
    user.id,
  ]);
  res.json({
    ok: true,
    role: 'user',
    username: row?.username ?? user.username,
    isSuperAdmin: false,
  });
});

// ─── Admin Management (super admin only) ────────────────────────────────────

adminRouter.get('/admins', requireSuperAdmin, async (_req, res) => {
  const admins = await db.all('SELECT id, username, created_at, last_password_change FROM admins');
  res.json({ admins });
});

adminRouter.post('/admins/:id/reset-password', requireSuperAdmin, async (req, res) => {
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  }
  const hash = await hashPassword(newPassword);
  const result = await db.run(
    'UPDATE admins SET password_hash = ?, last_password_change = datetime("now") WHERE id = ?',
    [hash, req.params.id],
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Admin not found' });
  res.json({ success: true });
});

// ─── Config (super admin only — branding + global settings) ──────────────────

adminRouter.get('/config', requireAuth, (_req, res) => {
  res.json(toPublicConfig());
});

adminRouter.put('/config', requireSuperAdmin, (req: Request, res: Response) => {
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
    'chooseQuizMaker',
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

adminRouter.post('/avatars/bulk', requireSuperAdmin, (req: Request, res: Response) => {
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

// ─── Ownership helpers ──────────────────────────────────────────────────────

function isSuperAdmin(req: Request): boolean {
  return getRequestUser(req)?.role === 'super_admin';
}

function currentUserId(req: Request): number | null {
  const user = getRequestUser(req);
  return user?.role === 'user' ? user.id : null;
}

/** Returns true if the requester may operate on the given quiz. */
async function canAccessQuiz(req: Request, quiz: DbQuiz): Promise<boolean> {
  if (isSuperAdmin(req)) return true;
  if (quiz.owner_kind === 'user' && quiz.owner_id === currentUserId(req)) return true;
  return false;
}

// ─── Quizzes ──────────────────────────────────────────────────────────────────

/** Insert one quiz question row (shared by quiz create + update). */
async function insertQuestion(
  quizId: number | string | undefined,
  q: QuizQuestion,
  orderIndex: number,
): Promise<void> {
  await db.run(
    'INSERT INTO questions (quiz_id, text, options, correct_index, base_score, time_sec, order_index, image_url, question_type, correct_answer, correct_indices, explanation, range_min, range_max, media_url, media_type, blanks, geo, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    quizId,
    q.text,
    JSON.stringify(q.options),
    q.correctIndex,
    q.baseScore ?? config.defaultBaseScore,
    q.timeSec ?? config.questionTimeSec,
    orderIndex,
    normalizeImageUrl(q.imageUrl) ?? null,
    q.questionType ?? 'multiple_choice',
    q.correctAnswer ?? null,
    q.correctIndices ? JSON.stringify(q.correctIndices) : null,
    normalizeOptionalText(q.explanation) ?? null,
    q.rangeMin ?? null,
    q.rangeMax ?? null,
    q.mediaType ? (q.mediaUrl ?? null) : null,
    q.mediaType ?? null,
    q.blanks ? JSON.stringify(q.blanks) : null,
    q.geo ? JSON.stringify(q.geo) : null,
    normalizeTags(q.tags),
  );
}

adminRouter.get('/quizzes', requireAuth, async (req, res) => {
  if (isSuperAdmin(req)) {
    const quizzes = await db.all<
      Array<
        DbQuiz & {
          owner_email: string | null;
          owner_username: string | null;
        }
      >
    >(`
      SELECT q.*, COUNT(qu.id) as question_count,
        (SELECT u.email FROM users u WHERE q.owner_kind = 'user' AND q.owner_id = u.id) as owner_email,
        (SELECT u.username FROM users u WHERE q.owner_kind = 'user' AND q.owner_id = u.id) as owner_username
      FROM quizzes q
      LEFT JOIN questions qu ON qu.quiz_id = q.id
      GROUP BY q.id
      ORDER BY COALESCE(
        (SELECT u.email FROM users u WHERE q.owner_kind = 'user' AND q.owner_id = u.id),
        ''
      ), q.created_at DESC
    `);
    return res.json(quizzes);
  }
  const userId = currentUserId(req);
  const quizzes = await db.all<DbQuiz[]>(
    `
      SELECT q.*, COUNT(qu.id) as question_count
      FROM quizzes q
      LEFT JOIN questions qu ON qu.quiz_id = q.id
      WHERE q.owner_kind = 'user' AND q.owner_id = ?
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `,
    userId,
  );
  res.json(quizzes);
});

adminRouter.get('/quizzes/:id', requireAuth, async (req: Request, res: Response) => {
  const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  if (!(await canAccessQuiz(req, quiz))) {
    return res.status(404).json({ error: 'Not found' });
  }
  const questions = await db.all<DbQuestion[]>(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
    req.params.id,
  );
  res.json({
    ...quiz,
    questions: questions.map(parseQuestionRow),
  });
});

adminRouter.post('/quizzes', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as QuizImportPayload;
  if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return res.status(400).json({ error: 'title and at least one question are required' });
  }

  // Super admin owns as 'admin' (owner_id NULL); user owns as 'user' with their id.
  const ownerKind = isSuperAdmin(req) ? 'admin' : 'user';
  const ownerId = isSuperAdmin(req) ? null : currentUserId(req);

  await db.run('BEGIN');
  try {
    const quizResult = await db.run(
      'INSERT INTO quizzes (title, description, cover_image, owner_id, owner_kind) VALUES (?, ?, ?, ?, ?)',
      body.title,
      body.description ?? '',
      normalizeImageUrl(body.coverImage) ?? null,
      ownerId,
      ownerKind,
    );
    const quizId = quizResult.lastID;
    for (let i = 0; i < body.questions.length; i++) {
      await insertQuestion(quizId, body.questions[i], i);
    }
    await db.run('COMMIT');
    res.status(201).json({ id: quizId });
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
});

adminRouter.put('/quizzes/:id', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as QuizImportPayload;
  if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return res.status(400).json({ error: 'title and at least one question are required' });
  }

  const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  if (!(await canAccessQuiz(req, quiz))) {
    return res.status(404).json({ error: 'Not found' });
  }

  await db.run('BEGIN');
  try {
    await db.run(
      'UPDATE quizzes SET title = ?, description = ?, cover_image = ? WHERE id = ?',
      body.title,
      body.description ?? '',
      normalizeImageUrl(body.coverImage) ?? null,
      req.params.id,
    );
    await db.run('DELETE FROM questions WHERE quiz_id = ?', req.params.id);
    for (let i = 0; i < body.questions.length; i++) {
      await insertQuestion(req.params.id as string, body.questions[i], i);
    }
    await db.run('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
});

adminRouter.delete('/quizzes/:id', requireAuth, async (req: Request, res: Response) => {
  const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  if (!(await canAccessQuiz(req, quiz))) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Delete sessions first (no ON DELETE CASCADE on sessions.quiz_id)
  await db.run('DELETE FROM sessions WHERE quiz_id = ?', req.params.id);
  await db.run('DELETE FROM quizzes WHERE id = ?', req.params.id);
  res.json({ ok: true });
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

adminRouter.post('/sessions', requireAuth, async (req: Request, res: Response) => {
  const { quizId } = req.body as { quizId: number };
  const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (!(await canAccessQuiz(req, quiz))) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  let pin = generatePin();
  while (await db.get("SELECT id FROM sessions WHERE pin = ? AND status != 'finished'", pin)) {
    pin = generatePin();
  }

  // Super admin: hosted_by_user_id = NULL. User: hosted_by_user_id = their id.
  const hostedBy = isSuperAdmin(req) ? null : currentUserId(req);

  const result = await db.run(
    'INSERT INTO sessions (quiz_id, pin, status, hosted_by_user_id) VALUES (?, ?, ?, ?)',
    quizId,
    pin,
    'waiting',
    hostedBy,
  );

  res.status(201).json({ id: result.lastID, pin });
});

adminRouter.get('/sessions', requireAuth, async (req, res) => {
  if (isSuperAdmin(req)) {
    const sessions = await db.all(`
      SELECT s.*, q.title as quiz_title,
        (SELECT COUNT(*) FROM players p WHERE p.session_id = s.id) as player_count,
        u.email as host_email, u.username as host_username
      FROM sessions s
      JOIN quizzes q ON q.id = s.quiz_id
      LEFT JOIN users u ON s.hosted_by_user_id = u.id
      ORDER BY COALESCE(u.email, ''), s.created_at DESC
    `);
    return res.json(sessions);
  }
  const userId = currentUserId(req);
  const sessions = await db.all(
    `
      SELECT s.*, q.title as quiz_title,
        (SELECT COUNT(*) FROM players p WHERE p.session_id = s.id) as player_count
      FROM sessions s
      JOIN quizzes q ON q.id = s.quiz_id
      WHERE s.hosted_by_user_id = ?
      ORDER BY s.created_at DESC
    `,
    userId,
  );
  res.json(sessions);
});

adminRouter.post('/sessions/:id/force-end', requireAuth, async (req: Request, res: Response) => {
  const session = await db.get<DbSession>('SELECT * FROM sessions WHERE id = ?', req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  if (!isSuperAdmin(req) && session.hosted_by_user_id !== currentUserId(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (session.status === 'finished') return res.json({ ok: true, already: true });
  await terminateSessionById(session.id);
  res.json({ ok: true });
});

adminRouter.get('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  const session = await db.get<DbSession>(
    `SELECT s.*, q.title as quiz_title
    FROM sessions s JOIN quizzes q ON q.id = s.quiz_id
    WHERE s.id = ?`,
    req.params.id,
  );
  if (!session) return res.status(404).json({ error: 'Not found' });
  if (!isSuperAdmin(req) && session.hosted_by_user_id !== currentUserId(req)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const players = await getRankedPlayers(req.params.id as string);

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
    questions: questions.map(parseQuestionRow),
    answers,
  });
});
