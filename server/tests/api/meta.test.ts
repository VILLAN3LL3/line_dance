import { describe, it, expect } from 'vitest';
import type { ILayer } from 'express-serve-static-core';
import type { OpenAPIV3 } from 'openapi-types';
import express from 'express';
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

type ApiRoute = { method: string; path: string };

function extractRoutes(stack: ILayer[]): ApiRoute[] {
  const routes: ApiRoute[] = [];
  for (const layer of stack) {
    if (layer.route) {
      const path = layer.route.path;
      if (typeof path !== 'string' || path.includes('*') || !path.startsWith('/api/')) continue;
      if (
        !('methods' in layer.route) ||
        typeof layer.route.methods !== 'object' ||
        layer.route.methods === null
      ) {
        throw new Error(`Route methods are unavailable for ${path}`);
      }
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({ method, path: path.replace(/:(\w+)/g, '{$1}') });
      }
    } else if (layer.handle && 'stack' in layer.handle && layer.handle.stack) {
      if (!Array.isArray(layer.handle.stack)) throw new Error('Invalid nested router stack');
      routes.push(...extractRoutes(layer.handle.stack));
    }
  }
  return routes;
}

describe('OpenAPI spec plausibility', () => {
  it('extracts every API method from nested routers and normalizes path parameters', () => {
    const application = express();
    const router = express.Router();
    router.get('/api/items/:id', (_req, res) => res.sendStatus(204));
    router.post('/api/items/:id', (_req, res) => res.sendStatus(204));
    router.get('/other', (_req, res) => res.sendStatus(204));
    application.use(router);

    expect(extractRoutes(application.router.stack)).toEqual([
      { method: 'get', path: '/api/items/{id}' },
      { method: 'post', path: '/api/items/{id}' },
    ]);
  });

  it('every route registered in the production app is documented in the OpenAPI spec', () => {
    const routes = extractRoutes(app.router.stack);

    // Sanity-check: the parser must find a reasonable number of routes
    expect(routes.length).toBeGreaterThan(20);

    const paths: OpenAPIV3.PathsObject = openApiSpec.paths;
    const missing = routes.filter(
      ({ method, path }) =>
        !Object.entries(paths[path] ?? {}).some(([key, value]) => key === method && value),
    );

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
