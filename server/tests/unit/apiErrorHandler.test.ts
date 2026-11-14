import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DATABASE_RESTARTING_ERROR_CODE } from '../../scripts/db.ts';
import { apiErrorHandler } from '../../utils/apiErrorHandler.ts';
import { captureError } from '../../utils/choreographyRouteErrors.ts';
import { captureDanceGroupError } from '../../utils/danceGroupRouteErrors.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('global API error handling', () => {
  it.each(['post', 'put', 'delete'] as const)(
    'returns the database-restarting response for %s requests',
    async (method) => {
      const app = express();
      app[method]('/resource', async () => {
        throw Object.assign(new Error('Database is restarting'), {
          code: DATABASE_RESTARTING_ERROR_CODE,
        });
      });
      app.use(apiErrorHandler);

      const response = await request(app)[method]('/resource');

      expect(response.status).toBe(503);
      expect(response.headers['retry-after']).toBe('3');
      expect(response.body.code).toBe(DATABASE_RESTARTING_ERROR_CODE);
    },
  );

  it('returns the generic error response for other errors', async () => {
    const app = express();
    app.get('/resource', () => {
      throw new Error('Failure');
    });
    app.use(apiErrorHandler);

    const response = await request(app).get('/resource');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });

  it('passes errors to the next handler when headers have already been sent', async () => {
    const app = express();
    const error = new Error('After headers');
    app.get('/resource', (_req, res, next) => {
      res.write('partial');
      next(error);
    });
    app.use(apiErrorHandler);
    // Express recognizes error handlers by their four parameters.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((received: unknown, _req: Request, res: Response, _next: NextFunction) => {
      expect(received).toBe(error);
      res.end(' complete');
    });

    const response = await request(app).get('/resource');
    expect(response.text).toBe('partial complete');
  });
});

describe.each([
  ['choreographies', captureError],
  ['dance-groups', captureDanceGroupError],
])('%s route error handling', (prefix, capture) => {
  it('rethrows database restart errors unchanged, even in test mode', () => {
    const error = Object.assign(new Error('Restart'), { code: DATABASE_RESTARTING_ERROR_CODE });
    expect(() => capture(error)).toThrow(error);
  });

  it('logs unexpected thrown values outside test mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    capture('failure');
    expect(write).toHaveBeenCalledWith(`[${prefix}] failure\n`);
  });

  it('does not log ordinary errors in test mode', () => {
    vi.stubEnv('NODE_ENV', 'test');
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    capture(null);
    expect(write).not.toHaveBeenCalled();
  });
});
