import type { Request, Response } from 'express';
import type { LearningStatusRequest } from '../features/learning-status/flow.ts';
import * as learningStatus from '../features/learning-status/flow.ts';
import { validateLearningStatus } from '../features/learning-status/validation.ts';
import { prepareInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';

type LearningStatusError = 'invalid_id' | 'not_found' | 'invalid_status';
type ErrorResponse = { error: string };
type StatusResponse =
  { choreography_id: number; status: string; status_date: string | null } | ErrorResponse;
type DeleteResponse = { message: 'Learning status removed' } | ErrorResponse;

const learningStatusErrors: Record<LearningStatusError, [number, string]> = {
  invalid_id: [400, 'Invalid choreography id'],
  not_found: [404, 'Choreography not found'],
  invalid_status: [400, 'Status must be "wishlist" or "learned"'],
};

function sendLearningStatusError<T>(
  res: Response<T | ErrorResponse>,
  error: LearningStatusError,
): Response<T | ErrorResponse> {
  const response = learningStatusErrors[error];
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareLearningStatus = prepareInput((req) => req.body, validateLearningStatus);

export async function setChoreographyLearningStatus(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<StatusResponse, { input: LearningStatusRequest }>,
): Promise<Response<StatusResponse> | void> {
  try {
    const result = await learningStatus.setLearningStatus(req.params.id, res.locals.input);
    if ('error' in result) return sendLearningStatusError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save learning status' });
  }
}

export async function deleteChoreographyLearningStatus(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await learningStatus.removeLearningStatus(req.params.id);
    if ('error' in result) return sendLearningStatusError(res, result.error);
    res.json({ message: 'Learning status removed' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete learning status' });
  }
}
