import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { db } from './db';
import type { JwtPayload } from './types';

function extractToken(req: Request): string | undefined {
  return req.cookies?.adminToken ?? req.headers.authorization?.replace('Bearer ', '');
}

/** Lifetime of every auth JWT issued by the app. */
const TOKEN_EXPIRES_IN = '7d';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as Partial<JwtPayload>;
    if (
      typeof decoded.id !== 'number' ||
      (decoded.role !== 'super_admin' && decoded.role !== 'user') ||
      typeof decoded.username !== 'string'
    ) {
      return null;
    }
    return { id: decoded.id, role: decoded.role, username: decoded.username };
  } catch {
    return null;
  }
}

function authenticateRequest(req: Request): JwtPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/** Helper to read the JWT payload placed on the request by requireAuth. */
export function getRequestUser(req: Request): JwtPayload | null {
  return (req as unknown as { user?: JwtPayload }).user ?? null;
}

async function assertUserNotBanned(payload: JwtPayload): Promise<boolean> {
  if (payload.role !== 'user') return true;
  const row = await db.get<{ is_banned: number }>('SELECT is_banned FROM users WHERE id = ?', [
    payload.id,
  ]);
  return Boolean(row && !row.is_banned);
}

/** Any valid JWT (super admin OR user). Populates req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const payload = authenticateRequest(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await assertUserNotBanned(payload))) {
    res.status(403).json({ error: 'This account has been banned' });
    return;
  }
  (req as unknown as { user: JwtPayload }).user = payload;
  next();
}

/** JWT must have role 'super_admin'. */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const payload = authenticateRequest(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (payload.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin only' });
    return;
  }
  (req as unknown as { user: JwtPayload }).user = payload;
  next();
}

/** Backward-compat alias for requireAuth (used by existing admin routes). */
export const requireAdmin = requireAuth;
