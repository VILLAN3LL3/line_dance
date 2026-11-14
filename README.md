# Line Dance App

[![CI](https://github.com/VILLAN3LL3/line_dance/actions/workflows/ci.yml/badge.svg)](https://github.com/VILLAN3LL3/line_dance/actions/workflows/ci.yml)

A full-stack line dance management app. The frontend is React + TypeScript; the backend is Express + SQLite.

__All code was written by GitHub Copilot. Use with caution.__

---

## Features

### Choreography Search & Catalog

- Search and filter by name, level, step figures, tags (include/exclude), authors, and max count
- Step figure matching modes: `all`, `any`, `exact` — all three are hierarchy-aware
- `up to max level` mode as an alternative to selecting individual levels
- Result count shown in the toolbar after every search
- Save, rename, load, update, and delete filter presets
- Switch between card and table views; filters and view mode persist in local storage
- Choreographer names in cards are limited to two lines, with a fade-out on overflow; click to expand or collapse the full list
- Create, edit, and delete choreographies with ratings (0–5)
- On save, invalid choreography fields show inline validation messages and their tabs are marked; edited fields are checked again on the next save.
- Add multiple choreography information entries, each with a category and description. Restart, Tag, Ending, Intro, Sequence, and Styling are seeded categories; custom categories can also be entered.

### Choreographers

- Statistics page listing every choreographer with total choreography count, broken down by level
- Filter by name and/or level; sort by name or total count
- Click a choreographer name or a level count to open a pre-filtered choreography search in a new tab

### Dance Group Administration

- Create, rename, and delete dance groups
- Manage dance courses per group with semester, start date, trainer, and playlist links (YouTube, Copperknob, Spotify)
- Course lifecycle statuses: `running`, `planned`, `passed` — default view shows only running courses
- Configure a max group level per group to cap step figure suggestions
- **Base step figures**: configure which step figures a group already knows before starting (defaults: Hip Bump, Hip Sway, Kick, Run)
- **Learned step figures**: computed from all sessions danced to date, merged with base step figures
- **Step figure suggestions**: ranked list of figures that would unlock the most new choreographies, accounting for both learned and base step figures — available at group level and per session
- Swap choreographies between sessions within a course
- Export course PDF (German): session dates, trainer contact with vCard QR code, playlist QR codes

### Step Figure Hierarchy

- Build composite step figures from ordered component figures
- Step figure references are protected from deletion when used in choreographies or other composites

### Sessions & Course Planning

- Create and delete sessions; attach and remove choreographies
- Adding a dance marks it as "New" and automatically schedules repetitions in the next two existing sessions of the same course. Existing assignments are preserved without duplicates. Repetitions display their chronological number within the course ("Repeat 1", "Repeat 2", etc.).
- Removing the original assignment also removes its linked automatic repetitions; removing one repetition leaves the original and other assignments intact. Independently planned assignments are never deleted through this link.
- Reorder session contents using drag handles (mouse, touch, or keyboard: Space, arrow keys, Space; Escape cancels). Descriptions and independently planned dances move together, while dates and session IDs stay fixed. Both drag-and-drop and the two-session swap atomically rebuild automatic repetitions at the next two course dates after each original assignment. This can update repetitions outside the visible selection.
- `POST /api/sessions/reorder-contents` maps contents from the supplied `session_ids` order onto the same sessions in chronological order (ID breaks date ties). Requires at least two distinct sessions from one course.
- Migration `013_add_session_choreography_repetitions` adds status and origin tracking. Existing assignments are classified by their first occurrence per course but are not retroactively linked or automatically expanded.
- Corrective migration `014_backfill_planned_session_repetitions` fills missing repetitions from legacy new-dance assignments in their next two course slots when those target dates are today or later in Europe/Berlin. Existing assignments and past session contents stay intact. Eligible legacy sources are enabled for subsequent automatic redistribution; already-managed sources are left unchanged so manually removed repetitions are not restored.
- Learned choreographies table: defaults to showing only choreographies danced at least once, with a toggle to show all

---

## Quick Start

### Prerequisites

- Node.js 24 LTS or newer (the backend currently runs TypeScript using Node's type stripping)

### Install & Run

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Run database migrations
cd server && npm run migrate && cd ..

# Start backend (port 3001)
cd server && npm run dev

# Start frontend (port 5173) — in a separate terminal
cd client && npm run dev
```

### Git Hooks

The pre-commit hook runs `prettier` on both packages. It is activated automatically after `npm install` in the root.

---

## API Documentation

Interactive docs (Swagger UI): **`http://localhost:3001/api/docs`**

Raw OpenAPI spec: `http://localhost:3001/api/openapi.json`

`POST /api/choreographies/validate` validates choreography data without saving. It shares the
create/update field rules and returns HTTP 400 with `issues` containing `{ field, key }` entries;
information row fields use paths such as `choreography_information.0.category`.

---

## Backend structure

The Express application is assembled in `server/app.js`; `server/scripts/server.js` initializes the
databases and migrations, starts the listener, and handles shutdown. Production and API tests use the
same app and route registrations. Choreography and dance-group HTTP routes are registered in their
respective router modules under `server/routes/`.

Backend features live under `server/features/`. Pure operations normalize, validate, and transform
data without database or HTTP dependencies; flows coordinate operations, persistence, external
services, and transactions; repositories own SQLite queries; and route handlers translate flow
results into HTTP responses. The URL checker uses an HTTP gateway, and the PDF renderer writes the
prepared document to the response. Search SQL is assembled on the repository side, while
step-figure hierarchy expansion is a pure operation.

Unit tests cover operations; integration tests exercise flows with SQLite or the HTTP gateway;
API tests verify HTTP contracts. ESLint enforces import restrictions and prevents direct network
requests in route handlers and pure operations.

For backend changes, follow the [backend architecture skill](.github/skills/backend-architecture/SKILL.md)
for responsibility boundaries, transaction handling, and testing.

The backend is being migrated incrementally from JavaScript to TypeScript. `npm run typecheck`
checks migrated TypeScript files and tests in strict mode; existing JavaScript is not yet type-checked.
The URL checker, trainers, dance groups, courses, sessions, ratings, saved filters, step figures, step-figure
suggestions, metadata, course PDF generation, shared choreography normalization, and database
helper are migrated; the remaining backend and tests still require migration.
Choreography search normalization and filter construction are migrated; its read flow and HTTP
input validation remain in JavaScript.
The migrated endpoints validate untrusted input with Zod and pure operations invoked by shared HTTP
middleware, configured per endpoint with its input source and validator. Flows receive typed
validation results, with branded types where appropriate. Existing error responses and their precedence are preserved;
rating conversion remains backward-compatible with the existing API.

The database helper `withTransaction()` serializes transactions and queries per SQLite connection.
Choreography writes (including cleanup), group/base-figure changes, trainer writes, course creation
and updates, rating updates, level creation, saved-filter and step-figure writes, session creation,
updates and rearrangement, assignment creation, and migrations use transaction boundaries to
prevent partial writes or lost updates. A failure during choreography cleanup rolls back the
operation and returns an error. The `personal_data` database is attached to the choreography connection; the separate
dance-groups and choreography connections do not share an atomic transaction. Cross-database reads
are therefore not a single consistent snapshot.

---

## Scripts

**Server** (`cd server`):

| Command | Description |
|---|---|
| `npm run dev` | Start with Node's built-in watcher; restarts when imported server files change |
| `npm start` | Start without file watching |
| `npm run migrate` | Run database migrations |
| `npm run typecheck` | Type-check migrated TypeScript code and tests |
| `npm test` | Run tests |
| `npm run test:watch` | Tests in watch mode |

**Client** (`cd client`):

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright interactive UI |

---

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

- Course status evaluation utility
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

---

## Local Production Server (PM2)

Run the app as a persistent local service that auto-starts on login and rebuilds after every commit.

### Setup

```bash
# 1. Build the client
cd client && npm run build && cd ..

# 2. Create local PM2 config
cp .env.pm2.example .env.pm2
# Edit .env.pm2 and set NODE_BINARY to: $(which node)

# 3. Start with PM2
pm2 start ecosystem.config.js

# 4. Register as a login item (run once)
pm2 startup launchd   # copy and run the printed sudo command
pm2 save
```

App is available at **`http://localhost:3001`**.

### Useful Commands

```bash
pm2 status
pm2 logs line-dance
pm2 restart line-dance
pm2 reload line-dance      # zero-downtime reload
```

### Auto-Deploy On Commit

The `post-commit` hook rebuilds `client/dist/` and restarts PM2 automatically after every `git commit`.
It resolves PM2 from `PATH` or an existing nvm installation; set `PM2_BINARY` to an absolute executable path to override this lookup.
Build or restart failures stop deployment without reporting success. The commit itself is already created when this hook runs.

### Uninstall

```bash
pm2 stop line-dance && pm2 delete line-dance && pm2 save
pm2 unstartup launchd   # copy and run the printed sudo command
```

---

## Continuous Integration

GitHub Actions runs on every push and pull request:

- **server**: install + test
- **client**: typecheck + test + build
- **e2e**: Playwright Chromium suite (artifacts uploaded on every run)

Workflow: `.github/workflows/ci.yml`

---

## Migrations

Choreography and dance-group schema changes are versioned under `server/migrations/`. The server runs migrations on startup; run them manually with:

```bash
cd server && npm run migrate
```

---

## License

European Union Public Licence (EUPL) v1.2
