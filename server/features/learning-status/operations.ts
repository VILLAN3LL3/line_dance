import { z } from 'zod';
import type { JsonValue } from '../../utils/json-input.ts';

export const learningStatuses = ['wishlist', 'learned'] as const;
const learningStatusSchema = z.enum(learningStatuses);

export type LearningStatus = z.output<typeof learningStatusSchema>;
/** `undefined` keeps the stored status, `null` removes it, a status sets it. */
export type LearningStatusChange = LearningStatus | null | undefined;

export function parseLearningStatus(value: unknown): LearningStatus | null {
  const result = learningStatusSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Empty strings and `null` clear the status, matching how the form sends "no status". */
export function normalizeLearningStatusChange(value: JsonValue | undefined): LearningStatusChange {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseLearningStatus(value) ?? undefined;
}

export function isValidLearningStatusChange(value: JsonValue | undefined): boolean {
  return (
    value === undefined || value === null || value === '' || parseLearningStatus(value) !== null
  );
}
