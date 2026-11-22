import type { Request, Response } from 'express';
import * as personalLevels from '../features/personal-levels/flow.ts';
import type { PersonalLevelRequest } from '../features/personal-levels/flow.ts';
import { validatePersonalLevel } from '../features/personal-levels/validation.ts';
import { prepareInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';

type PersonalLevelError = 'invalid_id' | 'not_found' | 'invalid_level';
type ErrorResponse = { error: string };
type PersonalLevelResponse = { choreography_id: number; level: string } | ErrorResponse;
type DeleteResponse = { message: 'Personal level removed' } | ErrorResponse;

const personalLevelErrors: Record<PersonalLevelError, [number, string]> = {
  invalid_id: [400, 'Invalid choreography id'],
  not_found: [404, 'Choreography not found'],
  invalid_level: [400, 'Level must be an existing level'],
};

function sendPersonalLevelError<T>(
  res: Response<T | ErrorResponse>,
  error: PersonalLevelError,
): Response<T | ErrorResponse> {
  const response = personalLevelErrors[error];
  if (!response) throw new Error(`Unknown personal level error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const preparePersonalLevel = prepareInput((req) => req.body, validatePersonalLevel);

export async function setChoreographyPersonalLevel(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<PersonalLevelResponse, { input: PersonalLevelRequest }>,
): Promise<Response<PersonalLevelResponse> | void> {
  try {
    const result = await personalLevels.setPersonalLevel(req.params.id, res.locals.input);
    if ('error' in result) return sendPersonalLevelError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save personal level' });
  }
}

export async function deleteChoreographyPersonalLevel(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await personalLevels.removePersonalLevel(req.params.id);
    if ('error' in result) return sendPersonalLevelError(res, result.error);
    res.json({ message: 'Personal level removed' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete personal level' });
  }
}
