import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../setup/testApp.js';

// ---------------------------------------------------------------------------
// Meta/Smoke endpoints
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/openapi.json', () => {
  it('returns OpenAPI spec document', async () => {
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info?.title).toBe('Line Dance API');
    expect(res.body.paths).toBeDefined();
    expect(res.body.paths['/api/health']).toBeDefined();
    expect(res.body.paths['/api/choreographies']).toBeDefined();
  });
});
