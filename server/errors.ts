import { Request, Response, NextFunction } from 'express';

/**
 * Domain error carrying an HTTP status, a stable machine-readable code and a
 * human message. Thrown from the store/validation layers and translated into a
 * structured JSON response by `handle()`.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Send a structured JSON error: `{ error: { code, message } }`. */
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

type RouteHandler = (req: Request, res: Response) => unknown | Promise<unknown>;

/**
 * Wrap a route handler so thrown `AppError`s become structured JSON responses
 * and any other error becomes a generic 500 (without leaking internals).
 */
export function handle(fn: RouteHandler) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.status, err.code, err.message);
      } else {
        console.error('[BanaScore] Unhandled error:', err);
        sendError(res, 500, 'INTERNAL', 'Internal server error');
      }
    }
  };
}
