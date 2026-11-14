import type { Request, Response } from 'express';
import * as ratings from '../features/ratings/flow.ts';
import type { RatingRequest } from '../features/ratings/flow.ts';
import { validateRating } from '../features/ratings/validation.ts';
import { prepareInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.js';

type RatingError = 'invalid_id' | 'not_found' | 'invalid_rating';

const ratingErrors: Record<RatingError, [number, string]> = {
  invalid_id: [400, 'Invalid choreography id'],
  not_found: [404, 'Choreography not found'],
  invalid_rating: [400, 'Rating must be an integer between 0 and 5'],
};

function sendRatingError(res: Response, error: RatingError): Response {
  const response = ratingErrors[error];
  if (!response) throw new Error(`Unknown rating error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareRating = prepareInput((req) => req.body, validateRating);

export async function rateChoreography(
  req: Request<{ id: string }, unknown, unknown>,
  res: Response<unknown, { input: RatingRequest }>,
): Promise<Response | void> {
  try {
    const result = await ratings.rateChoreography(req.params.id, res.locals.input);
    if ('error' in result) return sendRatingError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
}

export async function deleteChoreographyRating(
  req: Request<{ id: string }>,
  res: Response,
): Promise<Response | void> {
  try {
    const result = await ratings.removeRating(req.params.id);
    if ('error' in result) return sendRatingError(res, result.error);
    res.json({ message: 'Rating removed' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
}
