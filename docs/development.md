# Development Guide

Commands below assume the repository root as the starting directory unless stated otherwise.

## Prerequisites

- Node.js 24 LTS or newer (backend development uses Node's TypeScript type stripping).

## Install & Run

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build the backend and run database migrations
cd server && npm run build && npm run migrate && cd ..

# Start backend (port 3001)
cd server && npm run dev

# Start frontend (port 5173) — in a separate terminal
cd client && npm run dev
```

### Git Hooks

The pre-commit hook runs `prettier` on both packages. It is activated automatically after `npm install` in the root. The post-commit and post-merge hooks also deploy the local PM2 service; see the [operations guide](operations.md#auto-deploy-on-commit-and-pull).

## API Documentation

Interactive docs (Swagger UI): **`http://localhost:3001/api/docs`**

Raw OpenAPI spec: `http://localhost:3001/api/openapi.json`

`POST /api/choreographies/validate` validates choreography data without saving. It shares the
create/update field rules and returns HTTP 400 with `issues` containing `{ field, key }` entries;
information row fields use paths such as `choreography_information.0.category`.
Course creation and updates return an `issues` entry for duplicate IDs (`course_id`, `duplicate`)
or names (`name`, `duplicate`) alongside the existing error message.

`POST /api/sessions/reorder-contents` maps contents from the supplied `session_ids` order onto the
same sessions in chronological order (ID breaks date ties). Requires at least two distinct sessions
from one course.

See the [architecture overview](architecture.md) for backend and frontend responsibilities.

## Scripts

**Server** (`cd server`):

| Command              | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`        | Start with Node's built-in watcher; restarts when imported server files change |
| `npm run build`      | Compile the backend to `dist/`                                                 |
| `npm run build:pm2`  | Compile the PM2 configuration to `dist/pm2/`                                   |
| `npm start`          | Start the compiled backend without file watching (build first)                 |
| `npm run migrate`    | Run compiled database migrations (build first)                                 |
| `npm run typecheck`  | Type-check TypeScript code and tests                                           |
| `npm test`           | Run tests                                                                      |
| `npm run test:watch` | Tests in watch mode                                                            |

**Client** (`cd client`):

| Command               | Description               |
| --------------------- | ------------------------- |
| `npm run dev`         | Vite dev server           |
| `npm run build`       | Production build          |
| `npm run typecheck`   | TypeScript check          |
| `npm test`            | Run tests                 |
| `npm run test:watch`  | Tests in watch mode       |
| `npm run test:e2e`    | Playwright E2E tests      |
| `npm run test:e2e:ui` | Playwright interactive UI |

## Testing

### Server (Vitest + Supertest)

API integration tests run against in-memory SQLite. Coverage includes:

- Dance groups, courses, sessions, session choreographies, trainers
- Learned choreographies view and timeline edge cases
- Base step figures CRUD and default seeding
- Step figure suggestions (group-level and session-level) including base figure exclusion
- Max group level management
- Choreography CRUD, ratings, duplicate detection
- Author statistics (totals and per-level breakdowns)
- Search filters: `all`/`any`/`exact`, `max_level_value`, `excluded_tags`, `max_count`, hierarchy-aware matching
- Step figure hierarchy CRUD and validation (cycles, delete protection)
- Saved filter configuration lifecycle
- PDF export response headers
- OpenAPI spec plausibility (every API route registered in the Express app must be documented)

### Client (Vitest + Testing Library)

- Pure model functions (search filters, form mapping, course status, sorting, hierarchy)
- View models (search page, saved filters, save-with-duplicate-check, trainers)
- Choreography card, table, and search bar components
- Step figure hierarchy admin
- Dance group admin and detail (including base step figures merge and dedup logic)
- Course form and session management flows
- Choreographers statistics page (filtering, sorting, window.open integration)

### E2E (Playwright)

Tests run against in-memory SQLite databases (`CHOREOGRAPHY_DB_PATH=:memory:`, `DANCE_GROUPS_DB_PATH=:memory:`). Covers navigation, choreography flows, dance group admin, course/session lifecycle, trainers, and saved filters.

```bash
cd client && npm run test:e2e
```

For the Docker-based suite, see the [Docker E2E guide](../E2E_DOCKER.md).

## Continuous Integration

GitHub Actions runs on every push and pull request:

- **server**: install + lint + type-check + build + test
- **client**: typecheck + test + build
- **e2e**: Playwright Chromium suite (artifacts uploaded on every run)

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
