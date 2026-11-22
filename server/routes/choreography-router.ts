import { Router } from 'express';
import {
  createChoreography,
  validateChoreography,
  updateChoreography,
  deleteChoreography,
  prepareWrite,
  preparePartialWrite,
} from './choreographies.ts';
import {
  getChoreographies,
  getChoreographyById,
  checkDuplicateChoreographies,
  searchChoreographies,
  prepareList,
  prepareDuplicates,
  prepareSearch,
  prepareReadId,
} from './choreography-reads.ts';
import {
  getLevels,
  prepareLevelInput,
  addLevel,
  getTags,
  getChoreographyInfoCategories,
  getAuthors,
  getAuthorStats,
  getCountryCodes,
  getMaxChoreographyCount,
} from './choreography-metadata.ts';
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
import {
  preparePersonalLevel,
  setChoreographyPersonalLevel,
  deleteChoreographyPersonalLevel,
} from './choreography-personal-levels.ts';

export function createChoreographyRouter(): Router {
  const router = Router();
  router.post('/api/choreographies', prepareWrite, createChoreography);
  router.post('/api/choreographies/validate', prepareWrite, validateChoreography);
  router.get('/api/choreographies', prepareList, getChoreographies);
  router.get('/api/choreographies/search', prepareSearch, searchChoreographies);
  router.get('/api/choreographies/max-count', getMaxChoreographyCount);
  router.get('/api/choreographies/duplicates', prepareDuplicates, checkDuplicateChoreographies);
  router.get('/api/choreographies/:id', prepareReadId, getChoreographyById);
  router.put('/api/choreographies/:id', preparePartialWrite, updateChoreography);
  router.delete('/api/choreographies/:id', deleteChoreography);
  router.put('/api/choreographies/:id/rating', prepareRating, rateChoreography);
  router.delete('/api/choreographies/:id/rating', deleteChoreographyRating);
  router.put(
    '/api/choreographies/:id/personal-level',
    preparePersonalLevel,
    setChoreographyPersonalLevel,
  );
  router.delete('/api/choreographies/:id/personal-level', deleteChoreographyPersonalLevel);
  router.get('/api/levels', getLevels);
  router.post('/api/levels', prepareLevelInput, addLevel);
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
