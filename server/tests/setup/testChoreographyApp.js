/**
 * Minimal Express app wired with the choreography route handlers.
 * Uses whatever DB connection is injected via setDatabaseConnection('choreography', ...).
 * Does NOT start a real server – consumed by supertest directly.
 */
import express from 'express';
import {
  createChoreography,
  getChoreographies,
  getChoreographyById,
  updateChoreography,
  deleteChoreography,
  searchChoreographies,
  getLevels,
  addLevel,
  getTags,
  getAuthors,
  getStepFigures,
  getMaxChoreographyCount,
  getSavedFilterConfigurations,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
  deleteSavedFilterConfiguration,
} from '../../routes/choreographies.js';

const app = express();
// Mirror the production setting so bracket-notation array params (level[]=, step_figures[]=)
// are parsed correctly by the qs library, matching real browser request behaviour.
app.set('query parser', 'extended');
app.use(express.json());

// Specific paths before parameterised /:id to avoid 'search' being treated as an id
app.get('/api/choreographies/search', searchChoreographies);
app.get('/api/choreographies/max-count', getMaxChoreographyCount);
app.get('/api/choreographies', getChoreographies);
app.post('/api/choreographies', createChoreography);
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

export default app;
