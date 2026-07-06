import bcrypt from 'bcrypt';
import { type Request, type Response, Router } from 'express';
import { config } from '../config';
import { db, getRankedPlayers } from '../db';
import { getRequestUser, requireAuth, signToken } from '../middleware';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../passwords';
import { savePlayProfile } from '../playProfile';
import type { DbQuestion, DbSession, DbUser } from '../types';
import { isUserBanned, parseQuestionRow } from '../utils';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signUserToken(user: { id: number; username: string }): string {
  return signToken({ id: user.id, role: 'user', username: user.username });
}

/** Super-admin via env credentials or admins table (username match). */
async function trySuperAdminLogin(identifier: string, password: string): Promise<string | null> {
  const envUser = process.env.ADMIN_USERNAME || 'admin';
  const envPass = process.env.ADMIN_PASSWORD;
  if (envPass && identifier === envUser && password === envPass) {
    return signToken({ id: 0, role: 'super_admin', username: envUser });
  }

  const admin = await db.get<{ id: number; username: string; password_hash: string }>(
    'SELECT id, username, password_hash FROM admins WHERE username = ?',
    identifier,
  );
  if (admin && (await bcrypt.compare(password, admin.password_hash))) {
    return signToken({ id: 0, role: 'super_admin', username: admin.username });
  }
  return null;
}

function emailMatchesAllowedDomain(email: string): boolean {
  const domain = config.allowedDomain;
  if (!domain) return false;
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

// ─── Register ─────────────────────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, username } = req.body as {
    email: string;
    password: string;
    username?: string;
  };

  const cleanEmail = (email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!emailMatchesAllowedDomain(cleanEmail)) {
    const d = config.allowedDomain || '(none configured)';
    return res.status(403).json({ error: `Registration is restricted to @${d} email addresses` });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const cleanUsername = (username ?? '').trim().slice(0, 32);
  if (!cleanUsername) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const hash = await hashPassword(password);
    const result = await db.run(
      'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
      cleanEmail,
      cleanUsername,
      hash,
    );
    const userId = Number(result.lastID);
    const token = signUserToken({ id: userId, username: cleanUsername });
    res.status(201).json({ token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const identifier = (email ?? '').trim();
  const cleanEmail = identifier.toLowerCase();

  try {
    const adminToken = await trySuperAdminLogin(identifier, password);
    if (adminToken) {
      return res.json({ token: adminToken });
    }

    const user = await db.get<DbUser>('SELECT * FROM users WHERE email = ?', cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (isUserBanned(user.is_banned)) {
      return res.status(403).json({ error: 'This account has been banned' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signUserToken({ id: user.id, username: user.username });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ─── Logout (stateless JWT — client clears token) ─────────────────────────────

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken');
  res.json({ ok: true });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role === 'super_admin') {
    return res.json({
      ok: true,
      role: 'super_admin',
      id: 0,
      username: user.username,
      email: null,
    });
  }

  const row = await db.get<DbUser>('SELECT * FROM users WHERE id = ?', user.id);
  if (!row) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (isUserBanned(row.is_banned)) {
    return res.status(403).json({ error: 'This account has been banned' });
  }
  res.json({
    ok: true,
    role: 'user',
    id: row.id,
    username: row.username,
    email: row.email,
    playDisplayName: row.play_display_name ?? null,
    playAvatar: row.play_avatar ?? null,
  });
});

// ─── Play profile (in-game name + avatar) ─────────────────────────────────────

authRouter.patch('/play-profile', requireAuth, async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'user') {
    return res.status(403).json({ error: 'User accounts only' });
  }

  const { displayName, avatar } = req.body as { displayName?: string; avatar?: string };
  const cleanName = (displayName ?? '').trim().slice(0, 24);
  if (!cleanName) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  const cleanAvatar = typeof avatar === 'string' ? avatar.trim().slice(0, 512) : '';
  await savePlayProfile(user.id, cleanName, cleanAvatar || undefined);
  res.json({
    ok: true,
    playDisplayName: cleanName,
    playAvatar: cleanAvatar || null,
  });
});

// ─── Games the user joined as a player ────────────────────────────────────────

authRouter.get('/play-history', requireAuth, async (req, res) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'user') {
    return res.status(403).json({ error: 'User accounts only' });
  }

  const rows = await db.all<
    Array<{
      session_id: number;
      pin: string;
      quiz_title: string;
      status: DbSession['status'];
      total_score: number;
      player_count: number;
      rank: number;
      started_at: string | null;
      finished_at: string | null;
      created_at: string;
    }>
  >(
    `
      SELECT
        s.id as session_id,
        s.pin,
        q.title as quiz_title,
        s.status,
        p.total_score,
        (SELECT COUNT(*) FROM players px WHERE px.session_id = s.id) as player_count,
        (
          SELECT COUNT(*) + 1 FROM players p2
          WHERE p2.session_id = s.id AND p2.total_score > p.total_score
        ) as rank,
        s.started_at,
        s.finished_at,
        s.created_at
      FROM players p
      JOIN sessions s ON s.id = p.session_id
      JOIN quizzes q ON q.id = s.quiz_id
      WHERE p.user_id = ?
      ORDER BY COALESCE(s.finished_at, s.started_at, s.created_at) DESC
    `,
    user.id,
  );

  res.json({ games: rows });
});

authRouter.get('/play-history/:sessionId', requireAuth, async (req, res) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'user') {
    return res.status(403).json({ error: 'User accounts only' });
  }

  const sessionId = Number(req.params.sessionId);
  if (!Number.isFinite(sessionId)) {
    return res.status(400).json({ error: 'Invalid session id' });
  }

  const player = await db.get<{ id: number }>(
    'SELECT id FROM players WHERE session_id = ? AND user_id = ?',
    sessionId,
    user.id,
  );
  if (!player) return res.status(404).json({ error: 'Not found' });

  const session = await db.get<
    DbSession & { quiz_title: string }
  >(
    `SELECT s.*, q.title as quiz_title
     FROM sessions s JOIN quizzes q ON q.id = s.quiz_id
     WHERE s.id = ?`,
    sessionId,
  );
  if (!session) return res.status(404).json({ error: 'Not found' });

  const players = await getRankedPlayers(sessionId);
  const questions = await db.all<DbQuestion[]>(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
    session.quiz_id,
  );
  const answers = await db.all(
    'SELECT a.*, p.username FROM answers a JOIN players p ON p.id = a.player_id WHERE a.session_id = ?',
    sessionId,
  );

  const myIndex = players.findIndex((p) => p.id === player.id);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  res.json({
    session,
    myPlayerId: player.id,
    myRank,
    players,
    questions: questions.map(parseQuestionRow),
    answers,
  });
});

// ─── Change password (user only) ──────────────────────────────────────────────

authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'user') {
    return res
      .status(400)
      .json({ error: 'Super admin password is managed via environment variables' });
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const row = await db.get<DbUser>('SELECT * FROM users WHERE id = ?', user.id);
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    const hash = await hashPassword(newPassword);
    await db.run(
      'UPDATE users SET password_hash = ?, last_password_change = datetime("now") WHERE id = ?',
      hash,
      user.id,
    );
    res.json({ success: true });
  } catch (error) {
    console.error('User change-password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});
