import crypto from 'node:crypto';
import { type Request, type Response, Router } from 'express';
import { db } from '../db';
import { requireSuperAdmin } from '../middleware';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../passwords';
import type { DbUser } from '../types';

export const usersRouter = Router();

// All routes here are super-admin only.
usersRouter.use(requireSuperAdmin);

// ─── List users ────────────────────────────────────────────────────────────────

usersRouter.get('/', async (_req: Request, res: Response) => {
  const users = await db.all<
    Array<{
      id: number;
      email: string;
      username: string;
      is_banned: number;
      created_at: string;
      last_password_change: string | null;
      quiz_count: number;
    }>
  >(`
    SELECT u.id, u.email, u.username, u.is_banned, u.created_at, u.last_password_change,
      (SELECT COUNT(*) FROM quizzes q WHERE q.owner_id = u.id AND q.owner_kind = 'user') as quiz_count
    FROM users u
    ORDER BY u.created_at DESC
  `);
  res.json({ users });
});

// ─── Ban / unban ──────────────────────────────────────────────────────────────

usersRouter.post('/:id/ban', async (req: Request, res: Response) => {
  const result = await db.run('UPDATE users SET is_banned = 1 WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

usersRouter.post('/:id/unban', async (req: Request, res: Response) => {
  const result = await db.run('UPDATE users SET is_banned = 0 WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

// ─── Reset password ───────────────────────────────────────────────────────────

usersRouter.post('/:id/reset-password', async (req: Request, res: Response) => {
  // Allow caller to supply a password, otherwise generate a random one.
  const { newPassword } = (req.body ?? {}) as { newPassword?: string };
  const password =
    newPassword && newPassword.length >= MIN_PASSWORD_LENGTH
      ? newPassword
      : crypto.randomBytes(6).toString('base64url').slice(0, 12);

  const hash = await hashPassword(password);
  const result = await db.run(
    'UPDATE users SET password_hash = ?, last_password_change = datetime("now") WHERE id = ?',
    [hash, req.params.id],
  );
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  // Return the generated plaintext once so the super admin can hand it to the user.
  res.json({ ok: true, password });
});

// ─── Delete ──────────────────────────────────────────────────────────────────

usersRouter.delete('/:id', async (req: Request, res: Response) => {
  const row = await db.get<DbUser>('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  // ON DELETE SET NULL on quizzes.owner_id and sessions.hosted_by_user_id keeps the content.
  await db.run('DELETE FROM users WHERE id = ?', req.params.id);
  res.json({ ok: true });
});
