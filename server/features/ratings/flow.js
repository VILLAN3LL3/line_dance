import { validateChoreographyId, validateRating } from './validation.js';
import * as ratings from './repository.js';

export async function rateChoreography(rawId, input) {
  const id = validateChoreographyId(rawId);
  if (id.error) return id;
  return ratings.withRatingTransaction(async () => {
    if (!(await ratings.findChoreography(id.value))) return { error: 'not_found' };
    const rating = validateRating(input);
    if (rating.error) return rating;
    await ratings.saveRating(id.value, rating.value);
    return { value: { choreography_id: id.value, rating: rating.value } };
  });
}

export async function removeRating(rawId) {
  const id = validateChoreographyId(rawId);
  if (id.error) return id;
  await ratings.deleteRating(id.value);
  return { value: true };
}
