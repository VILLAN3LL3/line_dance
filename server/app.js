import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import swaggerUi from 'swagger-ui-express';
import { apiErrorHandler } from './utils/apiErrorHandler.js';
import { openApiSpec } from './scripts/openapi.js';
import { createChoreographyRouter } from './routes/choreography-router.js';
import { createDanceGroupsRouter } from './routes/dance-groups-router.js';
import { prepareUrl, checkUrl } from './routes/url-check.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, '../client/dist');

export function createApp() {
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
    app.use(express.static(clientDistPath));
    // SPA fallback: serve index.html for any non-API route (Express 5 requires named wildcard)
    app.get('/{*path}', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}
