import { Router } from 'express';
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
  getLearnedChoreographies,
  getGroupMaxLevel,
  updateGroupMaxLevel,
  getStepFigureSuggestions,
  getSessionStepFigureSuggestions,
  getGroupBaseStepFigures,
  updateGroupBaseStepFigures,
} from './dance-groups.js';
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  getSessionChoreographies,
  addChoreographyToSession,
  removeChoreographyFromSession,
  swapSessions,
  reorderSessionContents,
} from './sessions.js';

export function createDanceGroupsRouter() {
  const router = Router();
  router.get('/api/dance-groups', getDanceGroups);
  router.post('/api/dance-groups', createDanceGroup);
  router.get('/api/dance-groups/:groupId/max-level', getGroupMaxLevel);
  router.put('/api/dance-groups/:groupId/max-level', updateGroupMaxLevel);
  router.get('/api/dance-groups/:groupId/step-figure-suggestions', getStepFigureSuggestions);
  router.get('/api/dance-groups/:groupId/base-step-figures', getGroupBaseStepFigures);
  router.put('/api/dance-groups/:groupId/base-step-figures', updateGroupBaseStepFigures);
  router.get('/api/dance-groups/:id', getDanceGroupById);
  router.put('/api/dance-groups/:id', updateDanceGroup);
  router.delete('/api/dance-groups/:id', deleteDanceGroup);
  router.get('/api/trainers', getTrainers);
  router.post('/api/trainers', createTrainer);
  router.put('/api/trainers/:id', updateTrainer);
  router.delete('/api/trainers/:id', deleteTrainer);
  router.get('/api/dance-courses', getDanceCourses);
  router.post('/api/dance-courses', createDanceCourse);
  router.put('/api/dance-courses/:id', updateDanceCourse);
  router.delete('/api/dance-courses/:id', deleteDanceCourse);
  router.get('/api/dance-courses/:id/export-pdf', exportDanceCoursePdf);
  router.get('/api/sessions', getSessions);
  router.post('/api/sessions', createSession);
  router.post('/api/sessions/reorder-contents', reorderSessionContents);
  router.put('/api/sessions/:id', updateSession);
  router.delete('/api/sessions/:id', deleteSession);
  router.get('/api/session-choreographies', getSessionChoreographies);
  router.post('/api/session-choreographies', addChoreographyToSession);
  router.delete('/api/session-choreographies/:id', removeChoreographyFromSession);
  router.post('/api/sessions/:sessionId/swap/:targetSessionId', swapSessions);
  router.get('/api/sessions/:sessionId/step-figure-suggestions', getSessionStepFigureSuggestions);
  router.get('/api/learned-choreographies', getLearnedChoreographies);
  return router;
}
