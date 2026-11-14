import type { NextFunction, Request, Response } from 'express';
import {
  DATABASE_RESTARTING_ERROR_CODE,
  isDatabaseRestartingError,
  restartAfterDatabaseResponse,
} from '../scripts/db.ts';

export function apiErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  if (isDatabaseRestartingError(error)) {
    res.once('finish', restartAfterDatabaseResponse);
    return res.set('Retry-After', '3').status(503).json({
      error:
        'The server is reconnecting to its database. Your changes may not have been saved. Wait a few seconds, then try again.',
      code: DATABASE_RESTARTING_ERROR_CODE,
    });
  }

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({ error: 'Internal server error' });
}
