/**
 * Minimal Express app wired with the dance-groups route handlers.
 * Uses whatever DB connection is currently injected via setDatabaseConnection.
 * Does NOT start a real server – consumed by supertest directly.
 */
import express from 'express';
import bodyParser from 'body-parser';
import {
  getDanceGroups,
  createDanceGroup,
  getDanceGroupById,
  updateDanceGroup,
  deleteDanceGroup,
  getTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getDanceCourses,
  createDanceCourse,
  updateDanceCourse,
  deleteDanceCourse,
  exportDanceCoursePdf,
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  getSessionChoreographies,
  addChoreographyToSession,
  removeChoreographyFromSession,
  getLearnedChoreographies,
  getGroupLevels,
  addGroupLevel,
  removeGroupLevel,
} from '../../routes/dance-groups.js';
import { openApiSpec } from '../../openapi.js';

const app = express();
app.use(bodyParser.json());

// Dance Groups
app.get('/api/dance-groups', getDanceGroups);
app.post('/api/dance-groups', createDanceGroup);
app.get('/api/dance-groups/:id', getDanceGroupById);
app.put('/api/dance-groups/:id', updateDanceGroup);
app.delete('/api/dance-groups/:id', deleteDanceGroup);

// Group Levels (must come before /:id catch-all on sub-paths)
app.get('/api/dance-groups/:groupId/levels', getGroupLevels);
app.post('/api/dance-groups/:groupId/levels', addGroupLevel);
app.delete('/api/dance-groups/:groupId/levels/:level', removeGroupLevel);

// Trainers
app.get('/api/trainers', getTrainers);
app.post('/api/trainers', createTrainer);
app.put('/api/trainers/:id', updateTrainer);
app.delete('/api/trainers/:id', deleteTrainer);

// Dance Courses
app.get('/api/dance-courses', getDanceCourses);
app.post('/api/dance-courses', createDanceCourse);
app.put('/api/dance-courses/:id', updateDanceCourse);
app.delete('/api/dance-courses/:id', deleteDanceCourse);
app.get('/api/dance-courses/:id/export-pdf', exportDanceCoursePdf);

// Sessions
app.get('/api/sessions', getSessions);
app.post('/api/sessions', createSession);
app.put('/api/sessions/:id', updateSession);
app.delete('/api/sessions/:id', deleteSession);

// Session Choreographies
app.get('/api/session-choreographies', getSessionChoreographies);
app.post('/api/session-choreographies', addChoreographyToSession);
app.delete('/api/session-choreographies/:id', removeChoreographyFromSession);

// Learned Choreographies view
app.get('/api/learned-choreographies', getLearnedChoreographies);

// Meta endpoints
app.get('/api/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
