import { Router } from 'express';
import {
  getDanceGroups,
  createDanceGroup,
  getDanceGroupById,
  updateDanceGroup,
  deleteDanceGroup,
  getGroupMaxLevel,
  updateGroupMaxLevel,
  getGroupBaseStepFigures,
  updateGroupBaseStepFigures,
  prepareGroupName,
  prepareGroupIdentifier,
  prepareGroupChanges,
  prepareMaxIdentifier,
  prepareMaxChanges,
  prepareBaseIdentifier,
  prepareBaseChanges,
} from './dance-groups.ts';
import {
  getTrainers,
  prepareTrainer,
  createTrainer,
  updateTrainer,
  deleteTrainer,
} from './trainers.ts';
import {
  getDanceCourses,
  createDanceCourse,
  updateDanceCourse,
  deleteDanceCourse,
  prepareFilter,
  prepareCreate,
  prepareUpdate,
} from './dance-courses.ts';
import { preparePdfId, exportDanceCoursePdf } from './course-pdf.ts';
import {
  getLearnedChoreographies,
  getStepFigureSuggestions,
  getSessionStepFigureSuggestions,
  prepareLearned,
  prepareGroup,
  prepareSession,
} from './step-figure-suggestions.ts';
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  getSessionChoreographies,
  addChoreographyToSession,
  removeChoreographyFromSession,
  updateSessionChoreographySong,
  swapSessions,
  reorderSessionContents,
  prepareFilter as prepareSessionFilter,
  prepareNew as prepareNewSession,
  prepareUpdate as prepareSessionUpdate,
  prepareAssignmentFilter,
  prepareAssignment,
  prepareAssignmentSong,
  prepareReorder,
  prepareSwapIds,
} from './sessions.ts';

export function createDanceGroupsRouter(): Router {
  const router = Router();
  router.get('/api/dance-groups', getDanceGroups);
  router.post('/api/dance-groups', prepareGroupName, createDanceGroup);
  router.get('/api/dance-groups/:groupId/max-level', prepareMaxIdentifier, getGroupMaxLevel);
  router.put('/api/dance-groups/:groupId/max-level', prepareMaxChanges, updateGroupMaxLevel);
  router.get(
    '/api/dance-groups/:groupId/step-figure-suggestions',
    prepareGroup,
    getStepFigureSuggestions,
  );
  router.get(
    '/api/dance-groups/:groupId/base-step-figures',
    prepareBaseIdentifier,
    getGroupBaseStepFigures,
  );
  router.put(
    '/api/dance-groups/:groupId/base-step-figures',
    prepareBaseChanges,
    updateGroupBaseStepFigures,
  );
  router.get('/api/dance-groups/:id', prepareGroupIdentifier, getDanceGroupById);
  router.put('/api/dance-groups/:id', prepareGroupChanges, updateDanceGroup);
  router.delete('/api/dance-groups/:id', prepareGroupIdentifier, deleteDanceGroup);
  router.get('/api/trainers', getTrainers);
  router.post('/api/trainers', prepareTrainer, createTrainer);
  router.put('/api/trainers/:id', prepareTrainer, updateTrainer);
  router.delete('/api/trainers/:id', deleteTrainer);
  router.get('/api/dance-courses', prepareFilter, getDanceCourses);
  router.post('/api/dance-courses', prepareCreate, createDanceCourse);
  router.put('/api/dance-courses/:id', prepareUpdate, updateDanceCourse);
  router.delete('/api/dance-courses/:id', deleteDanceCourse);
  router.get('/api/dance-courses/:id/export-pdf', preparePdfId, exportDanceCoursePdf);
  router.get('/api/sessions', prepareSessionFilter, getSessions);
  router.post('/api/sessions', prepareNewSession, createSession);
  router.post('/api/sessions/reorder-contents', prepareReorder, reorderSessionContents);
  router.put('/api/sessions/:id', prepareSessionUpdate, updateSession);
  router.delete('/api/sessions/:id', deleteSession);
  router.get('/api/session-choreographies', prepareAssignmentFilter, getSessionChoreographies);
  router.post('/api/session-choreographies', prepareAssignment, addChoreographyToSession);
  router.patch(
    '/api/session-choreographies/:id',
    prepareAssignmentSong,
    updateSessionChoreographySong,
  );
  router.delete('/api/session-choreographies/:id', removeChoreographyFromSession);
  router.post('/api/sessions/:sessionId/swap/:targetSessionId', prepareSwapIds, swapSessions);
  router.get(
    '/api/sessions/:sessionId/step-figure-suggestions',
    prepareSession,
    getSessionStepFigureSuggestions,
  );
  router.get('/api/learned-choreographies', prepareLearned, getLearnedChoreographies);
  return router;
}
