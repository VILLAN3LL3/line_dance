import * as ratings from '../features/ratings/flow.js';
import { captureError } from '../utils/choreographyRouteErrors.js';

const ratingErrors = {
  invalid_id: [400, 'Invalid choreography id'],
  not_found: [404, 'Choreography not found'],
  invalid_rating: [400, 'Rating must be an integer between 0 and 5'],
};

function sendRatingError(res, error) {
  const response = ratingErrors[error];
  if (!response) throw new Error(`Unknown rating error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function rateChoreography(req, res) {
  try {
    const result = await ratings.rateChoreography(req.params.id, req.body);
    if (result.error) return sendRatingError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
}

export async function deleteChoreographyRating(req, res) {
  try {
    const result = await ratings.removeRating(req.params.id);
    if (result.error) return sendRatingError(res, result.error);
    res.json({ message: 'Rating removed' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
}
