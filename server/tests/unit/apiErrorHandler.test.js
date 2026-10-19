import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { DATABASE_RESTARTING_ERROR_CODE } from '../../scripts/db.js';
import { apiErrorHandler } from '../../utils/apiErrorHandler.js';

describe('global API error handling', () => {
  it.each(['post', 'put', 'delete'])(
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
});
