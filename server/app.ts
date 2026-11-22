import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { existsSync } from 'node:fs';
import swaggerUi from 'swagger-ui-express';
import { apiErrorHandler } from './utils/apiErrorHandler.ts';
import { openApiSpec } from './scripts/openapi.ts';
import { createChoreographyRouter } from './routes/choreography-router.ts';
import { createDanceGroupsRouter } from './routes/dance-groups-router.ts';
import { prepareUrl, checkUrl } from './routes/url-check.ts';
import { serverRoot } from './utils/server-paths.ts';

const clientDistPath = path.resolve(serverRoot, '../client/dist');

export function createApp(): Express {
  const app = express();

  // Don't leak Express version in response headers.
  app.disable('x-powered-by');

  // Express 5 changed the default query parser to 'simple' (native querystring),
  // which doesn't expand key[] notation into arrays. Set it back to 'extended'
  // (qs library) so array params like level[]=Beginner work correctly.
  app.set('query parser', 'extended');

  // Middleware
  app.use(cors()); // NOSONAR -- intentional: server runs locally only
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

  app.get('/api/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });

  app.use(createChoreographyRouter());
  app.use(createDanceGroupsRouter());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // URL reachability check (server-side proxy, avoids CORS)
  // Rate limit to prevent abuse and resource exhaustion
  const urlCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many URL checks from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.get('/api/url-check', urlCheckLimiter, prepareUrl, checkUrl);

  app.use(apiErrorHandler);

  // Serve built client static files
  if (existsSync(clientDistPath)) {
    // Rate limit file system access of the static/SPA handlers (CodeQL js/missing-rate-limiting).
    // Generous limit: a page load fetches many assets.
    const staticLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(staticLimiter);
    app.use(express.static(clientDistPath));
    // SPA fallback: serve index.html for any non-API route (Express 5 requires named wildcard)
    app.get('/{*path}', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}
