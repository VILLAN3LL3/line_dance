# Line Dance App

[![CI](https://github.com/VILLAN3LL3/line_dance/actions/workflows/ci.yml/badge.svg)](https://github.com/VILLAN3LL3/line_dance/actions/workflows/ci.yml)

A full-stack line dance management app. The frontend is React + TypeScript; the backend is Express + SQLite.

**All code was written by GitHub Copilot. Use with caution.**

## What the app does

- Search and manage choreographies, choreographers, and step figures.
- Manage dance groups, courses, and sessions, including automatic repetitions.
- Track learned dances and step figures, get 1-2-figure learning-path suggestions, and export course PDFs.

See the [user guide](docs/user-guide.md) for the available features and their behavior.

## Quick start

Requires Node.js 24 LTS or newer. From the repository root:

```bash
# Install dependencies
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

Installing root dependencies activates Git hooks. The post-commit and post-merge hooks deploy the
local PM2 service; see the [operations guide](docs/operations.md#auto-deploy-on-commit-and-pull).

## Documentation

| Audience / topic | Guide                                                       |
| ---------------- | ----------------------------------------------------------- |
| Users            | [Features and course planning](docs/user-guide.md)          |
| Developers       | [Setup, API, scripts, testing, and CI](docs/development.md) |
| Developers       | [Backend and frontend architecture](docs/architecture.md)   |
| Operators        | [PM2 deployment and migrations](docs/operations.md)         |
| Developers       | [Docker E2E tests](E2E_DOCKER.md)                           |

## License

European Union Public Licence (EUPL) v1.2
