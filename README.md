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
- Create, edit, and delete choreographies with ratings (0–5)

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
- Learned choreographies table: defaults to showing only choreographies danced at least once, with a toggle to show all

---

## Quick Start

### Prerequisites

- Node.js 18+

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

---

## Scripts

**Server** (`cd server`):

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start without nodemon |
| `npm run migrate` | Run database migrations |
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
- OpenAPI spec plausibility (every route in `server.js` must be documented)

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

Schema changes for the dance-group database are versioned under `server/migrations/`. The server runs migrations on startup; run them manually with:

```bash
cd server && npm run migrate
```

---

## License

European Union Public Licence (EUPL) v1.2
