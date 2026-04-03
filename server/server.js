import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { getDatabase, closeDatabase } from './db.js';
import { runMigrations } from './migrations/index.js';
import { openApiSpec } from './openapi.js';
import { createChoreography, getChoreographies, getChoreographyById, updateChoreography, deleteChoreography, searchChoreographies, getLevels, addLevel, getTags, getStepFigures, getAuthors, getSavedFilterConfigurations, saveFilterConfiguration, updateSavedFilterConfiguration, deleteSavedFilterConfiguration, getMaxChoreographyCount } from './routes/choreographies.js';
import { getDanceGroups, createDanceGroup, getDanceGroupById, updateDanceGroup, deleteDanceGroup, getTrainers, createTrainer, updateTrainer, deleteTrainer, getDanceCourses, createDanceCourse, updateDanceCourse, deleteDanceCourse, exportDanceCoursePdf, getSessions, createSession, updateSession, deleteSession, getSessionChoreographies, addChoreographyToSession, removeChoreographyFromSession, getLearnedChoreographies, getGroupLevels, addGroupLevel, removeGroupLevel } from './routes/dance-groups.js';
import { checkUrl } from './routes/url-check.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Express 5 changed the default query parser to 'simple' (native querystring),
// which doesn't expand key[] notation into arrays. Set it back to 'extended'
// (qs library) so array params like level[]=Beginner work correctly.
app.set('query parser', 'extended');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

app.get('/api/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// Initialize database
getDatabase();
getDatabase('danceGroups');
await runMigrations();

// Routes
app.post('/api/choreographies', createChoreography);
app.get('/api/choreographies', getChoreographies);
app.get('/api/choreographies/search', searchChoreographies);
app.get('/api/choreographies/max-count', getMaxChoreographyCount);
app.get('/api/choreographies/:id', getChoreographyById);
app.put('/api/choreographies/:id', updateChoreography);
app.delete('/api/choreographies/:id', deleteChoreography);
app.get('/api/levels', getLevels);
app.post('/api/levels', addLevel);
app.get('/api/tags', getTags);
app.get('/api/authors', getAuthors);
app.get('/api/step_figures', getStepFigures);
app.get('/api/saved-filters', getSavedFilterConfigurations);
app.post('/api/saved-filters', saveFilterConfiguration);
app.patch('/api/saved-filters/:id', updateSavedFilterConfiguration);
app.delete('/api/saved-filters/:id', deleteSavedFilterConfiguration);

// Dance Groups Routes
app.get('/api/dance-groups', getDanceGroups);
app.post('/api/dance-groups', createDanceGroup);
app.get('/api/dance-groups/:id', getDanceGroupById);
app.put('/api/dance-groups/:id', updateDanceGroup);
app.delete('/api/dance-groups/:id', deleteDanceGroup);

// Trainers Routes
app.get('/api/trainers', getTrainers);
app.post('/api/trainers', createTrainer);
app.put('/api/trainers/:id', updateTrainer);
app.delete('/api/trainers/:id', deleteTrainer);

// Dance Courses Routes
app.get('/api/dance-courses', getDanceCourses);
app.post('/api/dance-courses', createDanceCourse);
app.put('/api/dance-courses/:id', updateDanceCourse);
app.delete('/api/dance-courses/:id', deleteDanceCourse);
app.get('/api/dance-courses/:id/export-pdf', exportDanceCoursePdf);

// Sessions Routes
app.get('/api/sessions', getSessions);
app.post('/api/sessions', createSession);
app.put('/api/sessions/:id', updateSession);
app.delete('/api/sessions/:id', deleteSession);

// Session Choreographies Routes
app.get('/api/session-choreographies', getSessionChoreographies);
app.post('/api/session-choreographies', addChoreographyToSession);
app.delete('/api/session-choreographies/:id', removeChoreographyFromSession);

// Learned Choreographies View
app.get('/api/learned-choreographies', getLearnedChoreographies);

// Group Levels Routes
app.get('/api/dance-groups/:groupId/levels', getGroupLevels);
app.post('/api/dance-groups/:groupId/levels', addGroupLevel);
app.delete('/api/dance-groups/:groupId/levels/:level', removeGroupLevel);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// URL reachability check (server-side proxy, avoids CORS)
app.get('/api/url-check', checkUrl);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});
