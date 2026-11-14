import { rearrangeSessionContents } from './content-flow.js';
import { serializeAssignment } from './operations.js';
import * as sessions from './repository.js';
import { distributeRepetitions } from './repetition-repository.js';
import {
  validateAssignment,
  validateNewSession,
  validateReorder,
  validateSessionId,
  validateSessionUpdate,
  validateSwap,
} from './validation.js';

export function getSessions(courseId) {
  return sessions.listSessions(courseId);
}

export async function createSession(input) {
  const validation = validateNewSession(input);
  if (validation.error) return validation;
  return sessions.withSessionTransaction(async () => {
    if (!(await sessions.findCourse(validation.value.dance_course_id))) {
      return { error: 'course_not_found' };
    }
    const result = await sessions.insertSession(validation.value);
    return { value: await sessions.findSession(result.id) };
  });
}

export async function updateSession(id, input) {
  const validation = validateSessionUpdate(input);
  if (validation.error) return validation;
  return sessions.withSessionTransaction(async () => {
    if (!(await sessions.findSession(id))) return { error: 'session_not_found' };
    await sessions.saveSession(id, validation.value);
    return { value: await sessions.findSession(id) };
  });
}

export async function deleteSession(id) {
  return (await sessions.deleteSession(id)) ? { value: true } : { error: 'session_not_found' };
}

export async function getAssignments(sessionId) {
  const validation = validateSessionId(sessionId);
  if (validation.error) return validation;
  const rows = await sessions.listAssignments(validation.value);
  return { value: rows.map(serializeAssignment) };
}

export async function addAssignment(input) {
  const validation = validateAssignment(input);
  if (validation.error) return validation;
  const { session_id, choreography_id } = validation.value;
  return sessions.withSessionTransaction(async () => {
    const session = await sessions.findSession(session_id);
    if (!session) return { error: 'session_not_found' };
    const result = await sessions.insertAssignment(session_id, choreography_id);
    if (result.error) return result;
    await distributeRepetitions(session.dance_course_id, result.id);
    return { value: serializeAssignment(await sessions.findAssignment(result.id)) };
  });
}

export async function removeAssignment(id) {
  return (await sessions.deleteAssignment(id))
    ? { value: true }
    : { error: 'assignment_not_found' };
}

export function reorderContents(input) {
  const validation = validateReorder(input);
  return validation.error ? validation : rearrangeSessionContents(validation.value, 'reorder');
}

export function swapContents(firstId, secondId) {
  const validation = validateSwap(firstId, secondId);
  return validation.error ? validation : rearrangeSessionContents(validation.value, 'swap');
}
