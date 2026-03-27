import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.adminToken ?? req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      username: string;
      adminId: number;
      isSuperAdmin?: boolean;
    };
    (req as any).user = {
      username: decoded.username,
      adminId: decoded.adminId,
      isSuperAdmin: decoded.isSuperAdmin ?? false,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
