import type { Request, Response } from 'express';
import * as suggestions from '../features/suggestions/flow.ts';
import {
  prepareGroupSuggestion,
  prepareLearnedGroupId,
  prepareSessionSuggestion,
} from '../features/suggestions/operations.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

type SuggestionError =
  | 'invalid_group_id'
  | 'invalid_session_id'
  | 'group_not_found'
  | 'session_not_found'
  | 'course_not_found';
type ErrorResponse = { error: string };
type Learned = Awaited<ReturnType<typeof suggestions.getLearnedChoreographies>>;
type GroupResult = Awaited<ReturnType<typeof suggestions.getGroupSuggestions>>;
type SessionResult = Awaited<ReturnType<typeof suggestions.getSessionSuggestions>>;
type GroupResponse = Extract<GroupResult, { value: object }>['value'] | ErrorResponse;
type SessionResponse = Extract<SessionResult, { value: object }>['value'] | ErrorResponse;

const suggestionErrors: Record<SuggestionError, [number, string]> = {
  invalid_group_id: [400, 'Invalid group ID'],
  invalid_session_id: [400, 'Invalid session ID'],
  group_not_found: [404, 'Group not found'],
  session_not_found: [404, 'Session not found'],
  course_not_found: [404, 'Course not found'],
};

function sendSuggestionError<T>(
  res: Response<T | ErrorResponse>,
  error: SuggestionError,
): Response<T | ErrorResponse> {
  const response = suggestionErrors[error];
  if (!response) throw new Error(`Unknown suggestion error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareLearned = prepareInput(
  (req) => req.query.dance_group_id,
  prepareLearnedGroupId,
);
export const prepareGroup = prepareInput(
  (req) => ({ ...req.params, maxLevel: req.query.max_level_value }),
  prepareGroupSuggestion,
);
export const prepareSession = prepareInput((req) => req.params, prepareSessionSuggestion);

export async function getLearnedChoreographies(
  _req: Request,
  res: Response<
    Learned | ErrorResponse,
    { input: PreparedInput<ReturnType<typeof prepareLearnedGroupId>> }
  >,
): Promise<void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    res.json(await suggestions.getLearnedChoreographies(input.value));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch learned choreographies' });
  }
}

export async function getStepFigureSuggestions(
  _req: Request,
  res: Response<GroupResponse, { input: PreparedInput<ReturnType<typeof prepareGroupSuggestion>> }>,
): Promise<Response<GroupResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await suggestions.getGroupSuggestions(res.locals.input);
    if ('error' in result) return sendSuggestionError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to compute step figure suggestions' });
  }
}

export async function getSessionStepFigureSuggestions(
  _req: Request,
  res: Response<
    SessionResponse,
    { input: PreparedInput<ReturnType<typeof prepareSessionSuggestion>> }
  >,
): Promise<Response<SessionResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await suggestions.getSessionSuggestions(res.locals.input);
    if ('error' in result) return sendSuggestionError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to compute session step figure suggestions' });
  }
}
