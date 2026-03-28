# Line Dance App

A full-stack line dance management app with two main areas:

- choreography search and catalog management
- dance group administration with courses, sessions, learned figures, and course PDF export

The frontend is built with React and TypeScript. The backend is an Express API backed by SQLite.

## Features

### Choreography Search

- Search choreographies by name
- Filter by level, step figures, tags, and authors
- Choose step figure matching mode: `all`, `any`, or `exact`
- Filter choreographies without step figures
- Filter by maximum count
- Switch between card and table views
- Persist current filters and display mode in local storage
- Save, rename, update, and delete filter presets
- Create, edit, and delete choreographies

### Dance Group Administration

- Create, rename, and delete dance groups
- Manage dance courses per group
- Assign custom numeric course IDs when needed
- Track course semester and optional start date
- Store optional playlist links for:
  - YouTube
  - Copperknob
  - Spotify
- Edit existing courses inline
- Manage allowed levels per dance group
- Compute learned step figures from past course activity
- Jump back into choreography search using a group's learned figures and configured levels

### Sessions And Course Planning

- Create and delete sessions for a course
- Attach choreographies to sessions
- Remove choreographies from sessions
- View sessions in chronological order

### PDF Export

- Export a course PDF from the admin UI
- German-language PDF output
- Header with dance group name, course ID, and semester
- QR codes for playlist links when present
- Session date list included in the PDF

## Project Structure

```text
line_dance/
├── client/                  # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── api.ts
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   └── styles/
├── raw_data/                # CSV source files
├── server/                  # Express + SQLite backend
│   ├── db.js
│   ├── init-db.js
│   ├── init-dance-groups-db.js
│   ├── migrations/
│   ├── routes/
│   ├── server.js
│   ├── line_dance.db
│   └── dance_groups.db
└── README.md
```

## Routes In The UI

- `/` - choreography search
- `/choreographies/:id` - choreography detail
- `/admin` - dance group admin overview
- `/admin/groups/new` - create a new dance group
- `/admin/groups/:groupId` - dance group detail, course management, learned figures
- `/admin/groups/:groupId/courses/:courseId` - session and choreography management for a course

## Quick Start

### Prerequisites

- Node.js 18+ recommended
- npm

### Install Dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### Initialize The Dance Group Database

From the `server` directory:

```bash
npm run init-dance-groups-db
npm run migrate
```

The choreography database file `line_dance.db` is checked into the repository.

The commands above create or refresh `dance_groups.db` for:

- dance groups
- dance courses
- sessions
- session choreographies
- group levels

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

Run these from [server/package.json](/Users/mira/Documents/development/line_dance/server/package.json):

- `npm start` - start the API server
- `npm run dev` - start the API server with nodemon
- `npm run init-db` - initialize the choreography database
- `npm run init-dance-groups-db` - initialize the dance-groups database
- `npm run init-all` - initialize both databases (optional convenience script)
- `npm run migrate` - run dance-group database migrations

## Client Scripts

Run these from [client/package.json](/Users/mira/Documents/development/line_dance/client/package.json):

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run typecheck` - run TypeScript without emitting files
- `npm run preview` - preview the production build

## API Documentation

Use Swagger UI for all endpoint documentation and request/response details:

- `http://localhost:3001/api/docs`

Raw OpenAPI JSON is available at:

- `http://localhost:3001/api/openapi.json`

## Data Notes

### Choreography Search Database

The choreography side stores choreographies, levels, authors, tags, step figures, and saved filter configurations.

### Dance Group Database

The dance-group side stores:

- `dance_groups`
- `dance_courses`
- `sessions`
- `session_choreographies`
- `group_levels`
- `learned_choreographies` view

The course table includes optional playlist URL fields for YouTube, Copperknob, and Spotify.

## Migrations

Dance-group schema changes are versioned under [server/migrations](/Users/mira/Documents/development/line_dance/server/migrations).

Run migrations manually with:

```bash
cd server
npm run migrate
```

The server also runs migrations on startup before registering routes.

## Development Notes

- The backend uses Express, SQLite3, PDFKit, and QRCode generation.
- The frontend uses React 18, React Router, Axios, and Vite.
- If backend code changes and you are not using `npm run dev`, restart the server manually.

## License

European Union Public Licence (EUPL) v1.2

## Support

For issues or questions, please create an issue in the repository.
