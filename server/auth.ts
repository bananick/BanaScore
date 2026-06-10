import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import db from './db';
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

const PASSWORD_KEY = 'admin_password_hash';

/** Hash a password as `salt:hash` (scrypt) for storage. */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** Verify a password against a stored `salt:hash` value (constant-time). */
function verifyHashed(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function getStoredHash(): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(PASSWORD_KEY) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

/**
 * Constant-time check of a submitted admin password. Uses the password stored
 * in the database if one has been set, otherwise falls back to ADMIN_PASSWORD.
 */
export function checkPassword(password: unknown): boolean {
  if (typeof password !== 'string') return false;
  const stored = getStoredHash();
  if (stored) return verifyHashed(password, stored);
  return safeEqual(password, ADMIN_PASSWORD);
}

/** Persist a new admin password (hashed) in the database. */
export function setPassword(newPassword: string): void {
  const hash = hashPassword(newPassword);
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(PASSWORD_KEY, hash);
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

// --- Scorer ("animateur") access: a per-event code that authorises scoring
// only, without handing out the admin password on shared tablets. ---

/** Derive a scorer token scoped to a single event. */
export function issueScorerToken(eventId: number): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(`scorer:${eventId}`).digest('hex');
}

/** Verify a scorer token for a given event. */
export function verifyScorerToken(token: unknown, eventId: number): boolean {
  if (typeof token !== 'string' || token.length === 0) return false;
  return safeEqual(token, issueScorerToken(eventId));
}

/** Check a submitted scorer code against the event's stored code. */
export function verifyScorerCode(storedCode: string | null, code: unknown): boolean {
  if (!storedCode || typeof code !== 'string' || code.length === 0) return false;
  return safeEqual(code, storedCode);
}

/** True if the request carries a valid admin token. */
export function isAdmin(req: Request): boolean {
  return verifyToken(req.header('x-admin-token'));
}

/** True if the request carries a valid admin token OR a valid scorer token for the event. */
export function canScore(req: Request, eventId: number): boolean {
  return isAdmin(req) || verifyScorerToken(req.header('x-scorer-token'), eventId);
}
