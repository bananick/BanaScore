import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { sendError } from './errors';
import { getSetting, setSetting } from './store';

// Env-provided admin password (may be undefined). NOT thrown at import time:
// in the cloud the value arrives as a runtime secret, and the Firebase CLI loads
// this module during deploy before secrets are bound. Instead, `checkPassword`
// refuses logins in production when no password (stored or env) is configured.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD && !ADMIN_PASSWORD) {
  console.warn(
    '[BanaScore] ADMIN_PASSWORD not set in production — admin login needs a stored password ' +
      'hash or the ADMIN_PASSWORD secret.',
  );
} else if (!ADMIN_PASSWORD) {
  console.warn('[BanaScore] ADMIN_PASSWORD not set — using default "banana" (dev only).');
}

// Server session secret. In production, a fresh random secret each restart
// (unless provided via env) so tokens are invalidated on restart. In dev, a
// stable secret so you stay logged in across the frequent ts-node-dev reloads.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? crypto.randomBytes(32).toString('hex')
    : 'banascore-dev-secret');

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

function getStoredHash(): Promise<string | null> {
  return getSetting(PASSWORD_KEY);
}

/**
 * Constant-time check of a submitted admin password. Uses the password stored
 * in the database if one has been set, otherwise falls back to ADMIN_PASSWORD.
 */
export async function checkPassword(password: unknown): Promise<boolean> {
  if (typeof password !== 'string') return false;
  const stored = await getStoredHash();
  if (stored) return verifyHashed(password, stored);
  // No password configured yet: fall back to the env password, or the dev
  // default. In production with neither set, refuse rather than accept "banana".
  const fallback = ADMIN_PASSWORD ?? (IS_PROD ? null : 'banana');
  if (!fallback) return false;
  return safeEqual(password, fallback);
}

/** Persist a new admin password (hashed) in the database. */
export async function setPassword(newPassword: string): Promise<void> {
  await setSetting(PASSWORD_KEY, hashPassword(newPassword));
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
