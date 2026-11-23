import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Session, SessionChoreography } from '../contracts/api.ts';
import * as sessions from '../features/sessions/flow.ts';
import {
  prepareAssignmentSession,
  prepareSessionFilter,
  prepareSwap,
  validateAssignment,
  validateAssignmentSong,
  validateNewSession,
  validateReorder,
  validateSessionUpdate,
} from '../features/sessions/validation.ts';
import type {
  AssignmentResult,
  AssignmentSongResult,
  NewSessionResult,
  ReorderResult,
  SessionIdResult,
  SessionUpdateResult,
  SwapResult,
} from '../features/sessions/validation.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.ts';

type ErrorResponse = { error: string };
type SessionResponse = Session | ErrorResponse;
type Locals<T> = { input: PreparedInput<T> };
type Message = { message: string };

const sessionResponse = z.looseObject({
  id: z.number(),
  dance_course_id: z.number(),
  session_date: z.string(),
  dance_group_name: z.string(),
  semester: z.string().nullable(),
  comment: z.string().nullable(),
  created_at: z.string(),
});
const assignmentResponse = z.looseObject({
  id: z.number(),
  session_id: z.number(),
  choreography_id: z.number(),
  created_at: z.string(),
  is_new: z.boolean(),
  repetition_number: z.number(),
  repeat_source_id: z.number().nullable(),
  auto_repeat: z.boolean(),
  song_id: z.number().nullable(),
});

const sessionErrors: Record<sessions.SessionError, [number, string]> = {
  course_and_date_required: [400, 'Dance course ID and session date are required'],
  date_required: [400, 'Session date is required'],
  invalid_session_date: [400, 'Session date must be a valid date in YYYY-MM-DD format'],
  course_not_found: [404, 'Dance course not found'],
  session_not_found: [404, 'Session not found'],
  course_overlap: [400, 'The course dates overlap with another course in this group'],
  session_id_required: [400, 'Session ID is required'],
  assignment_ids_required: [400, 'Session ID and choreography ID are required'],
  duplicate_assignment: [400, 'Choreography already added to this session'],
  assignment_not_found: [404, 'Session choreography not found'],
  invalid_song: [400, 'Song must be a song of the assigned choreography or null'],
  invalid_reorder_ids: [400, 'Provide at least two unique session IDs'],
  invalid_swap_ids: [400, 'Invalid session IDs'],
  different_course: [400, 'Sessions must belong to the same course'],
};

function sendSessionError<T>(
  res: Response<T | ErrorResponse>,
  error: sessions.SessionError,
): Response<T | ErrorResponse> {
  const response = sessionErrors[error];
  if (!response) throw new Error(`Unknown session error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareFilter = prepareInput((req) => req.query, prepareSessionFilter);
export const prepareNew = prepareInput((req) => req.body, validateNewSession);
export const prepareUpdate = prepareInput((req) => req.body, validateSessionUpdate);
export const prepareAssignmentFilter = prepareInput((req) => req.query, prepareAssignmentSession);
export const prepareAssignment = prepareInput((req) => req.body, validateAssignment);
export const prepareAssignmentSong = prepareInput((req) => req.body, validateAssignmentSong);
export const prepareReorder = prepareInput((req) => req.body, validateReorder);
export const prepareSwapIds = prepareInput((req) => req.params, prepareSwap);

export async function getSessions(
  _req: Request,
  res: Response<Session[] | ErrorResponse, Locals<ReturnType<typeof prepareSessionFilter>>>,
): Promise<void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    res.json((await sessions.getSessions(input.value)).map((row) => sessionResponse.parse(row)));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

export async function createSession(
  _req: Request,
  res: Response<SessionResponse, Locals<NewSessionResult>>,
): Promise<Response<SessionResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.createSession(input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.status(201).json(sessionResponse.parse(result.value));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

export async function updateSession(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<SessionResponse, Locals<SessionUpdateResult>>,
): Promise<Response<SessionResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.updateSession(req.params.id, input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json(sessionResponse.parse(result.value));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

export async function deleteSession(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<Message | ErrorResponse>,
): Promise<Response<Message | ErrorResponse> | void> {
  try {
    const result = await sessions.deleteSession(req.params.id);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

export async function getSessionChoreographies(
  _req: Request,
  res: Response<SessionChoreography[] | ErrorResponse, Locals<SessionIdResult>>,
): Promise<Response<SessionChoreography[] | ErrorResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.getAssignments(input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json(result.value.map((row) => assignmentResponse.parse(row)));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch session choreographies' });
  }
}

export async function addChoreographyToSession(
  _req: Request,
  res: Response<SessionChoreography | ErrorResponse, Locals<AssignmentResult>>,
): Promise<Response<SessionChoreography | ErrorResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.addAssignment(input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.status(201).json(assignmentResponse.parse(result.value));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to add choreography to session' });
  }
}

export async function updateSessionChoreographySong(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<SessionChoreography | ErrorResponse, Locals<AssignmentSongResult>>,
): Promise<Response<SessionChoreography | ErrorResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.setAssignmentSong(req.params.id, input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json(assignmentResponse.parse(result.value));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update session choreography song' });
  }
}

export async function removeChoreographyFromSession(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<Message | ErrorResponse>,
): Promise<Response<Message | ErrorResponse> | void> {
  try {
    const result = await sessions.removeAssignment(req.params.id);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json({ message: 'Choreography removed from session successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to remove choreography from session' });
  }
}

export async function reorderSessionContents(
  _req: Request,
  res: Response<Message | ErrorResponse, Locals<ReorderResult>>,
): Promise<Response<Message | ErrorResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.reorderContents(input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json({ message: 'Session contents reordered successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to reorder session contents' });
  }
}

export async function swapSessions(
  _req: Request,
  res: Response<Message | ErrorResponse, Locals<SwapResult>>,
): Promise<Response<Message | ErrorResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await sessions.swapContents(input);
    if ('error' in result) return sendSessionError(res, result.error);
    res.json({ message: 'Sessions swapped successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to swap sessions' });
  }
}
