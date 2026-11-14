import { z } from 'zod';

export type IdValidationResult = { error: 'invalid_id' } | { value: number };

const validRating = z.number().int().min(0).max(5).brand<'Rating'>();
const ratingSchema = z.object({
  rating: z.preprocess(
    String,
    z
      .string()
      .transform((value) => Number.parseInt(value, 10))
      .pipe(validRating),
  ),
});

export type RatingValidationResult =
  { error: 'invalid_rating' } | { value: z.output<typeof validRating> };

export function validateChoreographyId(rawId: string): IdValidationResult {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? { error: 'invalid_id' } : { value: id };
}

export function validateRating(input: unknown): RatingValidationResult {
  const result = ratingSchema.safeParse(input);
  if (!result.success) return { error: 'invalid_rating' };
  return { value: result.data.rating };
}
