# Line Dance App

[![CI](https://github.com/VILLAN3LL3/line_dance/actions/workflows/ci.yml/badge.svg)](https://github.com/VILLAN3LL3/line_dance/actions/workflows/ci.yml)

A full-stack line dance management app with two main areas:

- choreography search and catalog management
- dance group administration with courses, sessions, learned figures, and course PDF export

The frontend is built with React and TypeScript. The backend is an Express API backed by SQLite.

__All code was written by GitHub Copilot. Use with caution.__

## Features

### Choreography Search

- Search choreographies by name
- Search results return all matches for the active filters (no `page` / `limit` pagination)
- Filter by level using either selected levels or `up to max level` mode
- Filter by step figures, tags (include/exclude), and authors
- Support saved filters that include `max_level_value` and `excluded_tags`
- Choose step figure matching mode: `all`, `any`, or `exact`
- Filter choreographies without step figures
- Filter by maximum count
- Switch between card and table views
- Persist current filters and display mode in local storage
- Save, rename, load, update, and delete filter presets
- Create, edit, and delete choreographies

### Dance Group Administration

- Create, rename, and delete dance groups
- Manage dance courses per group
- Assign custom numeric course IDs when needed
- Track course semester and optional start date
- Show course lifecycle status in course cards: `running`, `planned`, `passed`
- Default course view shows only `running` courses
- Toggle `planned` and `passed` courses with header checkboxes
- Store optional playlist links for:
  - YouTube
  - Copperknob
  - Spotify
- Create and edit courses on dedicated pages
- Manage trainers (name, phone, email) in a separate admin area
- Assign trainers to courses
- Configure a max group level per dance group
- Compute learned step figures from past course activity
- Jump back into choreography search using a group's learned figures and max level

### Sessions And Course Planning

- Create and delete sessions for a course
- Attach choreographies to sessions
- Remove choreographies from sessions
- View sessions in chronological order

### PDF Export

- Export a course PDF from the admin UI
- German-language PDF output
- Header with dance group name, course ID, and semester
- Termine box with session dates
- Kursleitung box with trainer contact details
- vCard QR code for trainer contact (when trainer is assigned)
- QR codes for playlist links when present

## Project Structure

```text
line_dance/
├── client/                  # React + TypeScript + Vite frontend
│   ├── e2e/                 # Playwright end-to-end tests
│   │   ├── choreographies/
│   │   ├── courses/
│   │   ├── dance-groups/
│   │   ├── filters/
│   │   ├── helpers/
│   │   ├── navigation/
│   │   └── trainers/
│   ├── playwright.config.ts
│   ├── src/
│   │   ├── api.ts
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   └── styles/
├── raw_data/                # CSV source files
├── server/                  # Express + SQLite backend
│   ├── migrations/
│   ├── scripts/
│   │   ├── db.js
│   │   ├── openapi.js
│   │   └── server.js
│   ├── routes/
│   └── data/
│       ├── line_dance.db
│       ├── dance_groups.db
│       └── personal_tags.db
└── README.md
```

## Routes In The UI

- `/` - choreography search
- `/choreographies/:id` - choreography detail
- `/admin` - dance group admin overview
- `/admin/groups/new` - create a new dance group
- `/admin/groups/:groupId` - dance group detail, course management, learned figures
- `/admin/groups/:groupId/courses/new` - create course page
- `/admin/groups/:groupId/courses/:courseId/edit` - edit course page
- `/admin/groups/:groupId/courses/:courseId` - session and choreography management for a course
- `/trainers` - trainer management

## Quick Start

### Prerequisites

- Node.js 18+ recommended
- npm

### Install Dependencies

```bash
npm install

cd server
npm install

cd ../client
npm install
```

### Initialize Databases

From the `server` directory:

```bash
npm run migrate
```

The choreography database file `line_dance.db` is checked into the repository.

## Git Hooks

The repository uses a pre-commit hook to run formatting in both the server and client before each commit.

After cloning, install the root dependencies once to enable the hook:

```bash
npm install
```

The hook runs:

```bash
npm --prefix server run format
npm --prefix client run format
```

The migration command above creates or refreshes schema for:

- dance groups
- dance courses
- sessions
- session choreographies
- max group level value on dance groups

### Run The App

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Default local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`

## Server Scripts

Run these from `server/package.json`:

- `npm start` - start the API server
- `npm run dev` - start the API server with nodemon
- `npm run migrate` - run all server database migrations
- `npm test` - run server tests with Vitest
- `npm run test:watch` - run server tests in watch mode

## Client Scripts

Run these from `client/package.json`:

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run typecheck` - run TypeScript without emitting files
- `npm run preview` - preview the production build
- `npm test` - run client tests with Vitest
- `npm run test:watch` - run client tests in watch mode
- `npm run test:e2e` - run Playwright E2E tests
- `npm run test:e2e:ui` - run Playwright in interactive UI mode

## Testing

The project includes automated tests for backend business logic and frontend component behavior.

### Server Tests (Vitest + Supertest)

- API integration tests run against in-memory SQLite databases
- Dance-group schema tests use the real migration pipeline (`runDanceGroupsMigrations`) to match production schema
- Coverage includes:
  - dance groups, trainers, courses, sessions, session choreographies
  - learned choreographies view behavior for past/future session timelines
  - max group level management
  - choreography CRUD and search filter logic (`all` / `any` / `exact`, max count, `max_level_value`, `excluded_tags`, combined filters)
  - saved filter configuration lifecycle
  - PDF export endpoint headers and response behavior
  - health and OpenAPI smoke endpoints
  - utility/unit tests for vCard escaping and filter normalization

Run server tests:

```bash
cd server
npm test
```

### Client Tests (Vitest + Testing Library)

- Utility tests for course status evaluation logic
- Component tests for:
  - choreography card, table, and search bar
  - dance groups admin and dance group detail views
  - course form page and course detail/session management flows

Run client tests:

```bash
cd client
npm test
```

### End-To-End Tests (Playwright)

- E2E tests are grouped by user-facing use cases under `client/e2e`:
  - `navigation` - app shell and primary route navigation
  - `choreographies` - create/search/detail/edit/delete choreography flows
  - `dance-groups` - dance group admin and detail behaviors
  - `courses` - course edit and session/choreography lifecycle
  - `trainers` - trainer validation, create/edit/delete
  - `filters` - saved filter configuration lifecycle and updates
- Shared API seed helpers live in `client/e2e/helpers/api.ts`.
- Playwright starts both backend and frontend automatically via `webServer`.
- E2E runs against in-memory SQLite databases using:
  - `CHOREOGRAPHY_DB_PATH=:memory:`
  - `DANCE_GROUPS_DB_PATH=:memory:`

Run E2E tests:

```bash
cd client
npm run test:e2e
```

## Continuous Integration

GitHub Actions runs CI on every push and pull request:

- server job: install dependencies and run backend tests
- client job: type-check, run frontend tests, and build production bundle
- e2e job: install Playwright Chromium and run full end-to-end suite

The E2E job uploads Playwright artifacts on every run (including failures):

- `client/playwright-report`
- `client/test-results`

Workflow file:

- `.github/workflows/ci.yml`

## API Documentation

Use Swagger UI for all endpoint documentation and request/response details:

- `http://localhost:3001/api/docs`

Raw OpenAPI JSON is available at:

- `http://localhost:3001/api/openapi.json`

Search endpoint note:

- `GET /api/choreographies/search` always returns all matching choreographies for the provided filters.
- `page` and `limit` are not used for this endpoint.

## Data Notes

### Choreography Search Database

The choreography side stores choreographies, levels, authors, tags, step figures, and saved filter configurations.

### Dance Group Database

The dance-group side stores:

- `dance_groups`
- `dance_courses`
- `trainers`
- `sessions`
- `session_choreographies`
- `max_group_level_value` column on `dance_groups`
- `learned_choreographies` view

The course table includes optional playlist URL fields for YouTube, Copperknob, and Spotify, plus an optional trainer relation.

## Migrations

Dance-group schema changes are versioned under `server/migrations`.

Run migrations manually with:

```bash
cd server
npm run migrate
```

The server also runs migrations on startup before registering routes.

## Development Notes

- The backend uses Express, SQLite3, PDFKit, and QRCode generation.
- The frontend uses React, React Router, Axios, and Vite.
- If backend code changes and you are not using `npm run dev`, restart the server manually.

## License

European Union Public Licence (EUPL) v1.2
