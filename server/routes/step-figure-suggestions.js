import * as suggestions from '../features/suggestions/flow.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const suggestionErrors = {
  invalid_group_id: [400, 'Invalid group ID'],
  invalid_session_id: [400, 'Invalid session ID'],
  group_not_found: [404, 'Group not found'],
  session_not_found: [404, 'Session not found'],
  course_not_found: [404, 'Course not found'],
};

function sendSuggestionError(res, error) {
  const response = suggestionErrors[error];
  if (!response) throw new Error(`Unknown suggestion error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getLearnedChoreographies(req, res) {
  try {
    res.json(await suggestions.getLearnedChoreographies(req.query.dance_group_id));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch learned choreographies' });
  }
}

export async function getStepFigureSuggestions(req, res) {
  try {
    const result = await suggestions.getGroupSuggestions(
      req.params.groupId,
      req.query.max_level_value,
    );
    if (result.error) return sendSuggestionError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to compute step figure suggestions' });
  }
}

export async function getSessionStepFigureSuggestions(req, res) {
  try {
    const result = await suggestions.getSessionSuggestions(req.params.sessionId);
    if (result.error) return sendSuggestionError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to compute session step figure suggestions' });
  }
}
