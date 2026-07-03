import bcrypt from 'bcrypt';
import { type Request, type Response, Router } from 'express';
import { config } from '../config';
import { db } from '../db';
import { getRequestUser, requireAuth, signToken } from '../middleware';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../passwords';
import type { DbUser } from '../types';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signUserToken(user: { id: number; username: string }): string {
  return signToken({ id: user.id, role: 'user', username: user.username });
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
  const cleanEmail = (email ?? '').trim().toLowerCase();

  try {
    const user = await db.get<DbUser>('SELECT * FROM users WHERE email = ?', cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.is_banned) {
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
  if (!row || row.is_banned) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    ok: true,
    role: 'user',
    id: row.id,
    username: row.username,
    email: row.email,
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
