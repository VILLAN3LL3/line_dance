import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.ts';

describe('Express app middleware', () => {
  const app = createApp();

  it('serves API responses with CORS enabled and without the Express version header', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://example.com');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('handles CORS preflight before dispatching API routes', async () => {
    const response = await request(app)
      .options('/api/choreographies')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });
});
