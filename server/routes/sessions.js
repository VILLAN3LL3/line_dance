import * as sessions from '../features/sessions/flow.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const sessionErrors = {
  course_and_date_required: [400, 'Dance course ID and session date are required'],
  date_required: [400, 'Session date is required'],
  course_not_found: [404, 'Dance course not found'],
  session_not_found: [404, 'Session not found'],
  session_id_required: [400, 'Session ID is required'],
  assignment_ids_required: [400, 'Session ID and choreography ID are required'],
  duplicate_assignment: [400, 'Choreography already added to this session'],
  assignment_not_found: [404, 'Session choreography not found'],
  invalid_reorder_ids: [400, 'Provide at least two unique session IDs'],
  invalid_swap_ids: [400, 'Invalid session IDs'],
  different_course: [400, 'Sessions must belong to the same course'],
};

function sendSessionError(res, error) {
  const response = sessionErrors[error];
  if (!response) throw new Error(`Unknown session error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getSessions(req, res) {
  try {
    res.json(await sessions.getSessions(req.query.dance_course_id));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

export async function createSession(req, res) {
  try {
    const result = await sessions.createSession(req.body);
    if (result.error) return sendSessionError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

export async function updateSession(req, res) {
  try {
    const result = await sessions.updateSession(req.params.id, req.body);
    if (result.error) return sendSessionError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

export async function deleteSession(req, res) {
  try {
    const result = await sessions.deleteSession(req.params.id);
    if (result.error) return sendSessionError(res, result.error);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

export async function getSessionChoreographies(req, res) {
  try {
    const result = await sessions.getAssignments(req.query.session_id);
    if (result.error) return sendSessionError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch session choreographies' });
  }
}

export async function addChoreographyToSession(req, res) {
  try {
    const result = await sessions.addAssignment(req.body);
    if (result.error) return sendSessionError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to add choreography to session' });
  }
}

export async function removeChoreographyFromSession(req, res) {
  try {
    const result = await sessions.removeAssignment(req.params.id);
    if (result.error) return sendSessionError(res, result.error);
    res.json({ message: 'Choreography removed from session successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to remove choreography from session' });
  }
}

export async function reorderSessionContents(req, res) {
  try {
    const result = await sessions.reorderContents(req.body);
    if (result.error) return sendSessionError(res, result.error);
    res.json({ message: 'Session contents reordered successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to reorder session contents' });
  }
}

export async function swapSessions(req, res) {
  try {
    const result = await sessions.swapContents(req.params.sessionId, req.params.targetSessionId);
    if (result.error) return sendSessionError(res, result.error);
    res.json({ message: 'Sessions swapped successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to swap sessions' });
  }
}
