# Line Dance Choreography Search App

A full-stack web application to search, create, and manage line dance choreographies with filtering by level and step figures.

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
- Search choreographies by name
- Filter by difficulty level (Beginner, Intermediate, Advanced, Experienced)
- Filter by step figures (Vine, Shuffle, Grapevine, etc.)
- Filter by tags
- Pagination support

✅ **Create & Edit**
- Add new choreographies with detailed information
- Edit existing choreographies
- Manage multiple authors, tags, and step figures per choreography

✅ **Database**
- SQLite database with normalized schema
- Support for many-to-many relationships (authors, step figures, tags)
- Automatic timestamp tracking

✅ **UI/UX**
- Modern, responsive design
- Color-coded difficulty levels
- Quick filtering interface
- Card-based layout with hover effects

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

The server will start on `http://localhost:5000`

### Client Setup

```bash
cd client
npm install
npm run dev
```

The app will automatically open at `http://localhost:3000`

## API Endpoints

### Get All Choreographies
```
GET /api/choreographies?page=1&limit=20
```

### Search Choreographies
```
GET /api/choreographies/search?level=Intermediate&step_figures=Vine&step_figures=Shuffle&search=example
```

### Get Single Choreography
```
GET /api/choreographies/:id
```

### Create Choreography
```
POST /api/choreographies
Content-Type: application/json

{
  "name": "Country Road",
  "level": "Intermediate",
  "count": 64,
  "wall_count": 4,
  "creation_year": 2023,
  "step_sheet_link": "https://example.com/sheet.pdf",
  "authors": ["Jane Doe"],
  "step_figures": ["Vine", "Shuffle"],
  "tags": ["Country", "Western"]
}
```

### Update Choreography
```
PUT /api/choreographies/:id
Content-Type: application/json

{
  "name": "Country Road v2",
  "level": "Intermediate",
  ...
}
```

### Delete Choreography
```
DELETE /api/choreographies/:id
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
- name ✓
- step_sheet_link
- count
- wall_count ✓
- level ✓
- creation_year
- created_at
- updated_at

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

## Development

### Adding Sample Data

You can create sample data through the UI or by making POST requests:

```bash
curl -X POST http://localhost:5000/api/choreographies \
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

## Future Enhancements

- User authentication & profiles
- Favorites/bookmarks functionality
- Video demonstrations of choreographies
- Community ratings & reviews
- Export to various formats (PDF, Excel)
- Mobile app (React Native)
- Advanced analytics dashboard

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
