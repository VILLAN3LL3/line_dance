# Line Dance Choreography Search App

A full-stack web application to search, create, and manage line dance choreographies with advanced filtering, saved filter configurations, and a responsive React UI.

## Project Structure

```
line_dance/
├── server/          # Express.js backend with SQLite
│   ├── package.json
│   ├── server.js
│   ├── db.js
│   ├── init-db.js
│   ├── routes/
│   │   └── choreographies.js
│   └── line_dance.db (created after init)
└── client/          # React + TypeScript frontend with Vite
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── api.ts
        ├── types.ts
        ├── components/
        │   ├── App.tsx
        │   ├── ChoreographyForm.tsx
        │   ├── ChoreographyCard.tsx
        │   └── SearchBar.tsx
        └── styles/
            ├── index.css
            ├── App.css
            ├── ChoreographyCard.css
            ├── ChoreographyForm.css
            └── SearchBar.css
```

## Features

✅ **Search & Filter**
- Search by choreography name
- Filter by level, step figures, tags, and authors
- Step figure matching modes: `all`, `any`, `exact`
- Filter choreographies with no step figures
- Max counts slider filter (step size: 8)

✅ **Saved Filter Configurations**
- Save named filter presets to the database
- Load, rename, update, and delete saved presets
- Saved filters include all active filter fields, including `max_count`
- Saved filters panel is collapsible and collapsed by default

✅ **Create & Edit**
- Add new choreographies with detailed metadata
- Edit and delete existing choreographies
- Manage many-to-many data for authors, tags, and step figures

✅ **Persistence & UX**
- Current filters and display mode persist via localStorage
- Mobile-friendly layout and filter controls
- Card and table list views

## Choreography Data Model

Each choreography contains:
- **Name** - Choreography title
- **Level** - Difficulty (Beginner, Intermediate, Advanced, Experienced)
- **Count** - Number of counts
- **Wall Count** - Number of walls
- **Year Created** - Creation year
- **Step Sheet Link** - URL to the step sheet PDF/image
- **Authors** - List of choreographers
- **Step Figures** - List of included dance steps
- **Tags** - Custom category tags

## Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- macOS, Linux, or Windows

### Server Setup

```bash
cd server
npm install
node init-db.js
npm start
```

The server runs on `http://localhost:3001`.

### Client Setup

```bash
cd client
npm install
npm run dev
```

The client dev server runs on `http://localhost:5173`.

## API Endpoints

### Choreographies
```
GET /api/choreographies?page=1&limit=20
GET /api/choreographies/:id
POST /api/choreographies
PUT /api/choreographies/:id
DELETE /api/choreographies/:id
```

### Search
```
GET /api/choreographies/search
```

Supported query parameters:
- `search`
- `level` (repeatable)
- `step_figures` (repeatable)
- `step_figures_match_mode` (`all` | `any` | `exact`)
- `without_step_figures` (`true` | `false`)
- `tags` (repeatable)
- `authors` (repeatable)
- `max_count` (integer)
- `sort_field`, `sort_direction`
- `page`, `limit`

### Search Metadata
```
GET /api/choreographies/max-count
GET /api/levels
GET /api/step_figures
GET /api/tags
GET /api/authors
```

### Saved Filter Configurations
```
GET /api/saved-filters
POST /api/saved-filters
PATCH /api/saved-filters/:id
DELETE /api/saved-filters/:id
```

## Technologies Used

### Backend
- **Express.js** - Web framework
- **SQLite3** - Database
- **CORS** - Cross-origin resource sharing
- **body-parser** - Request body parsing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Axios** - HTTP client

## Database Schema

### choreographies
- id (Primary Key)
- name
- step_sheet_link
- demo_video_url
- tutorial_video_url
- count
- wall_count
- level_id (Foreign Key to levels)
- creation_year
- tag_information
- restart_information
- created_at
- updated_at

### levels
- id (Primary Key)
- name (Unique)

### authors
- id (Primary Key)
- name (Unique)

### choreography_authors (Junction Table)
- choreography_id (Foreign Key)
- author_id (Foreign Key)

### step_figures
- id (Primary Key)
- name (Unique)

### choreography_step_figures (Junction Table)
- choreography_id (Foreign Key)
- step_figure_id (Foreign Key)

### tags
- id (Primary Key)
- name (Unique)

### choreography_tags (Junction Table)
- choreography_id (Foreign Key)
- tag_id (Foreign Key)

### saved_filter_configurations
- id (Primary Key)
- name (Unique)
- filters_json
- created_at
- updated_at

## Development

### Adding Sample Data

You can create sample data through the UI or by making POST requests:

```bash
curl -X POST http://localhost:3001/api/choreographies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tumbleweed",
    "level": "Beginner",
    "count": 32,
    "wall_count": 2,
    "creation_year": 2022,
    "authors": ["John Smith"],
    "step_figures": ["Rock Step", "Shuffle"],
    "tags": ["Western", "Easy"]
  }'
```

### Running in Development Mode

**Server (with auto-reload on changes):**
```bash
cd server
npm run dev
```

**Client (with hot module replacement):**
```bash
cd client
npm run dev
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- For backend auto-reload during development, run `npm run dev` in `server`.
- If you run `npm start`, restart the server after backend code changes.

## License

European Union Public Licence (EUPL) v1.2

## Support

For issues or questions, please create an issue in the repository.
