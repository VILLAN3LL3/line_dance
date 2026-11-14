import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../setup/testApp.js';
import { openApiSpec } from '../../scripts/openapi.ts';

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

function extractRoutes(stack) {
  const routes = [];
  for (const layer of stack) {
    if (layer.route) {
      const path = layer.route.path;
      if (typeof path !== 'string' || path.includes('*') || !path.startsWith('/api/')) continue;
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({ method, path: path.replace(/:(\w+)/g, '{$1}') });
      }
    } else if (layer.handle?.stack) {
      routes.push(...extractRoutes(layer.handle.stack));
    }
  }
  return routes;
}

describe('OpenAPI spec plausibility', () => {
  it('every route registered in the production app is documented in the OpenAPI spec', () => {
    const routes = extractRoutes(app.router.stack);

    // Sanity-check: the parser must find a reasonable number of routes
    expect(routes.length).toBeGreaterThan(20);

    const missing = routes.filter(({ method, path }) => !openApiSpec.paths[path]?.[method]);

    if (missing.length > 0) {
      const lines = missing
        .map(({ method, path }) => `  ${method.toUpperCase()} ${path}`)
        .join('\n');
      throw new Error(
        `Routes missing from OpenAPI spec (add them to scripts/openapi.ts):\n${lines}`,
      );
    }
  });
});
