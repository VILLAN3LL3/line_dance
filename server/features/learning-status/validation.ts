import { z } from 'zod';
import { learningStatuses } from './operations.ts';
import type { LearningStatus } from './operations.ts';

const statusInput = z.object({ status: z.enum(learningStatuses) });

export type LearningStatusValidationResult =
  { error: 'invalid_status' } | { value: LearningStatus };

export function validateLearningStatus(input: unknown): LearningStatusValidationResult {
  const result = statusInput.safeParse(input);
  return result.success ? { value: result.data.status } : { error: 'invalid_status' };
}
