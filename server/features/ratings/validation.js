export function validateChoreographyId(rawId) {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? { error: 'invalid_id' } : { value: id };
}

export function validateRating(input) {
  const rating = Number.parseInt(String(input?.rating), 10);
  if (Number.isNaN(rating) || rating < 0 || rating > 5) return { error: 'invalid_rating' };
  return { value: rating };
}
