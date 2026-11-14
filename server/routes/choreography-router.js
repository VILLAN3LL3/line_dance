import { Router } from 'express';
import {
  createChoreography,
  validateChoreography,
  getChoreographies,
  getChoreographyById,
  updateChoreography,
  deleteChoreography,
  checkDuplicateChoreographies,
} from './choreographies.js';
import { searchChoreographies } from './choreography-search.js';
import {
  getLevels,
  addLevel,
  getTags,
  getChoreographyInfoCategories,
  getAuthors,
  getAuthorStats,
  getCountryCodes,
  getMaxChoreographyCount,
} from './choreography-metadata.js';
import {
  getStepFigures,
  getStepFiguresWithIds,
  getStepFigureHierarchy,
  prepareFigure,
  createStepFigure,
  updateStepFigure,
  deleteStepFigure,
} from './step-figures.ts';
import {
  getSavedFilterConfigurations,
  prepareSaveFilter,
  prepareUpdateFilter,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
  deleteSavedFilterConfiguration,
} from './saved-filters.ts';
import {
  prepareRating,
  rateChoreography,
  deleteChoreographyRating,
} from './choreography-ratings.ts';

export function createChoreographyRouter() {
  const router = Router();
  router.post('/api/choreographies', createChoreography);
  router.post('/api/choreographies/validate', validateChoreography);
  router.get('/api/choreographies', getChoreographies);
  router.get('/api/choreographies/search', searchChoreographies);
  router.get('/api/choreographies/max-count', getMaxChoreographyCount);
  router.get('/api/choreographies/duplicates', checkDuplicateChoreographies);
  router.get('/api/choreographies/:id', getChoreographyById);
  router.put('/api/choreographies/:id', updateChoreography);
  router.delete('/api/choreographies/:id', deleteChoreography);
  router.put('/api/choreographies/:id/rating', prepareRating, rateChoreography);
  router.delete('/api/choreographies/:id/rating', deleteChoreographyRating);
  router.get('/api/levels', getLevels);
  router.post('/api/levels', addLevel);
  router.get('/api/tags', getTags);
  router.get('/api/choreography-info-categories', getChoreographyInfoCategories);
  router.get('/api/authors', getAuthors);
  router.get('/api/authors/stats', getAuthorStats);
  router.get('/api/country-codes', getCountryCodes);
  router.get('/api/step_figures/hierarchy', getStepFigureHierarchy);
  router.post('/api/step_figures', prepareFigure, createStepFigure);
  router.put('/api/step_figures/:id', prepareFigure, updateStepFigure);
  router.delete('/api/step_figures/:id', deleteStepFigure);
  router.get('/api/step_figures', getStepFigures);
  router.get('/api/step_figures/with-ids', getStepFiguresWithIds);
  router.get('/api/saved-filters', getSavedFilterConfigurations);
  router.post('/api/saved-filters', prepareSaveFilter, saveFilterConfiguration);
  router.patch('/api/saved-filters/:id', prepareUpdateFilter, updateSavedFilterConfiguration);
  router.delete('/api/saved-filters/:id', deleteSavedFilterConfiguration);
  return router;
}
