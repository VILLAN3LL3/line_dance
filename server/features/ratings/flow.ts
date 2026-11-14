import { validateChoreographyId } from './validation.ts';
import type { RatingValidationResult } from './validation.ts';
import * as ratings from './repository.ts';

type RateResult =
  | { error: 'invalid_id' | 'not_found' | 'invalid_rating' }
  | { value: { choreography_id: number; rating: number } };
type RemoveResult = { error: 'invalid_id' } | { value: true };
export type RatingRequest = RatingValidationResult | { exception: TypeError | RangeError };

export async function rateChoreography(rawId: string, input: RatingRequest): Promise<RateResult> {
  const id = validateChoreographyId(rawId);
  if ('error' in id) return id;
  return ratings.withRatingTransaction(async () => {
    if (!(await ratings.findChoreography(id.value))) return { error: 'not_found' };
    if ('exception' in input) throw input.exception;
    if ('error' in input) return input;
    await ratings.saveRating(id.value, input.value);
    return { value: { choreography_id: id.value, rating: input.value } };
  });
}

export async function removeRating(rawId: string): Promise<RemoveResult> {
  const id = validateChoreographyId(rawId);
  if ('error' in id) return id;
  await ratings.deleteRating(id.value);
  return { value: true };
}
