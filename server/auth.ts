import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { sendError } from './errors';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'banana';
if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    '[BanaScore] ADMIN_PASSWORD is not set — using default "banana". Set it before deploying.',
  );
}

// Server session secret: a fresh random secret each restart (unless provided),
// so tokens are invalidated on restart. Set SESSION_SECRET to keep them stable.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

/** Derive the (stateless) admin session token from the server secret. */
export function issueToken(): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update('admin-session').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** Constant-time check of a submitted admin password. */
export function checkPassword(password: unknown): boolean {
  if (typeof password !== 'string') return false;
  return safeEqual(password, ADMIN_PASSWORD);
}

/** Verify a submitted admin token. */
export function verifyToken(token: unknown): boolean {
  if (typeof token !== 'string' || token.length === 0) return false;
  return safeEqual(token, issueToken());
}

/** Express middleware guarding admin-only routes via the `x-admin-token` header. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.header('x-admin-token');
  if (!verifyToken(token)) {
    sendError(res, 401, 'UNAUTHORIZED', 'Admin authentication required');
    return;
  }
  next();
}
