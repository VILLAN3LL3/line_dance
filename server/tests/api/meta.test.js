import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../setup/testApp.js';
import { openApiSpec } from '../../scripts/openapi.js';

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

// ---------------------------------------------------------------------------
// OpenAPI spec plausibility
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverJsPath = resolve(__dirname, '../../scripts/server.js');

function extractServerRoutes(content) {
  const pattern = /app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  const routes = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const method = match[1].toLowerCase();
    const path = match[2];
    // Skip SPA catch-all and non-API routes
    if (path.includes('*') || !path.startsWith('/api/')) continue;
    // Convert Express :param notation to OpenAPI {param} notation
    const openApiPath = path.replace(/:(\w+)/g, '{$1}');
    routes.push({ method, path: openApiPath });
  }
  return routes;
}

describe('OpenAPI spec plausibility', () => {
  it('every route registered in server.js is documented in the OpenAPI spec', () => {
    const content = readFileSync(serverJsPath, 'utf-8');
    const routes = extractServerRoutes(content);

    // Sanity-check: the parser must find a reasonable number of routes
    expect(routes.length).toBeGreaterThan(20);

    const missing = routes.filter(({ method, path }) => !openApiSpec.paths[path]?.[method]);

    if (missing.length > 0) {
      const lines = missing.map(({ method, path }) => `  ${method.toUpperCase()} ${path}`).join('\n');
      throw new Error(`Routes missing from OpenAPI spec (add them to scripts/openapi.js):\n${lines}`);
    }
  });
});
