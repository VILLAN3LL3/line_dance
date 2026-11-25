import type { Request, Response } from 'express';
import * as practice from '../features/practice/flow.ts';
import type {
  BaselineRequest,
  LogListRequest,
  LogPracticeRequest,
} from '../features/practice/flow.ts';
import type { PracticeSummary } from '../features/practice/operations.ts';
import type { PracticeLogEntry } from '../features/practice/repository.ts';
import {
  validateBaseline,
  validateLogList,
  validateLogPractice,
} from '../features/practice/validation.ts';
import { prepareInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';

type ErrorResponse = { error: string };

const practiceErrors: Record<string, [number, string]> = {
  invalid_choreography_ids: [400, 'choreography_ids must be 1 to 100 positive integers'],
  invalid_date: [400, 'practiced_on must be a valid date (YYYY-MM-DD)'],
  invalid_confidence: [400, 'confidence must be "sure" or "unsure"'],
  invalid_song: [400, 'song_id must belong to the practiced choreography'],
  invalid_note: [400, 'note must be at most 500 characters'],
  invalid_step: [400, 'step must be an integer between 1 and 14'],
  invalid_spread: [400, 'spread must be a boolean'],
  not_learned: [400, 'Only learned dances can be set to an interval step'],
  invalid_limit: [400, 'limit must be an integer between 1 and 500'],
  invalid_offset: [400, 'offset must be a non-negative integer'],
  invalid_query: [400, 'q must be at most 100 characters'],
  invalid_id: [400, 'Invalid practice entry id'],
  future_date: [400, 'practiced_on must not be in the future'],
  not_found: [404, 'Choreography or practice entry not found'],
};

function sendPracticeError<T>(
  res: Response<T | ErrorResponse>,
  error: string,
): Response<T | ErrorResponse> {
  const response = practiceErrors[error];
  if (!response) throw new Error(`Unknown practice error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const preparePracticeLog = prepareInput((req) => req.body, validateLogPractice);
export const preparePracticeBaseline = prepareInput((req) => req.body, validateBaseline);
export const preparePracticeList = prepareInput((req) => req.query, validateLogList);

export async function logPractice(
  _req: Request,
  res: Response<
    { logged: number; practiced_on: string } | ErrorResponse,
    { input: LogPracticeRequest }
  >,
): Promise<Response | void> {
  try {
    const result = await practice.logPractice(res.locals.input);
    if ('error' in result) return sendPracticeError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to log practice' });
  }
}

export async function listPracticeLog(
  _req: Request,
  res: Response<
    { data: PracticeLogEntry[]; total: number } | ErrorResponse,
    { input: LogListRequest }
  >,
): Promise<Response | void> {
  try {
    const result = await practice.listPracticeLog(res.locals.input);
    if ('error' in result) return sendPracticeError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to load practice log' });
  }
}

export async function deletePracticeEntry(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<{ message: 'Practice entry removed' } | ErrorResponse>,
): Promise<Response | void> {
  try {
    const result = await practice.removePracticeEntry(req.params.id);
    if ('error' in result) return sendPracticeError(res, result.error);
    res.json({ message: 'Practice entry removed' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete practice entry' });
  }
}

export async function getPracticeSuggestions(
  _req: Request,
  res: Response<PracticeSummary[] | ErrorResponse>,
): Promise<Response | void> {
  try {
    res.json(await practice.getPracticeSuggestions());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to load practice suggestions' });
  }
}

export async function setPracticeBaseline(
  _req: Request,
  res: Response<{ updated: number; step: number } | ErrorResponse, { input: BaselineRequest }>,
): Promise<Response | void> {
  try {
    const result = await practice.setPracticeBaseline(res.locals.input);
    if ('error' in result) return sendPracticeError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to set the interval step' });
  }
}

export function getIntervalTiers(
  _req: Request,
  res: Response<{ tiers: ReturnType<typeof practice.getIntervalTiers> }>,
): void {
  res.json({ tiers: practice.getIntervalTiers() });
}
