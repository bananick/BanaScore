import { AppError } from './errors';

const INVALID = 'INVALID_INPUT';

/** Validate a required, trimmed string within [min, max] length bounds. */
export function reqString(
  value: unknown,
  field: string,
  { min = 1, max = 100 }: { min?: number; max?: number } = {},
): string {
  if (typeof value !== 'string') {
    throw new AppError(400, INVALID, `"${field}" is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new AppError(400, INVALID, `"${field}" must be at least ${min} character(s)`);
  }
  if (trimmed.length > max) {
    throw new AppError(400, INVALID, `"${field}" must be at most ${max} character(s)`);
  }
  return trimmed;
}

/** Validate an optional string. Empty/absent → null, otherwise trimmed & capped. */
export function optString(value: unknown, field: string, max = 200): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new AppError(400, INVALID, `"${field}" must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > max) {
    throw new AppError(400, INVALID, `"${field}" must be at most ${max} character(s)`);
  }
  return trimmed;
}

/** Validate a required integer within [min, max]. */
export function reqInt(
  value: unknown,
  field: string,
  { min, max }: { min?: number; max?: number } = {},
): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    throw new AppError(400, INVALID, `"${field}" must be an integer`);
  }
  if (min !== undefined && n < min) {
    throw new AppError(400, INVALID, `"${field}" must be >= ${min}`);
  }
  if (max !== undefined && n > max) {
    throw new AppError(400, INVALID, `"${field}" must be <= ${max}`);
  }
  return n;
}

const EVENT_STATUSES = ['open', 'closed', 'archived'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Validate an event status value. */
export function reqStatus(value: unknown, field = 'status'): EventStatus {
  if (typeof value !== 'string' || !EVENT_STATUSES.includes(value as EventStatus)) {
    throw new AppError(400, INVALID, `"${field}" must be one of: ${EVENT_STATUSES.join(', ')}`);
  }
  return value as EventStatus;
}
