import { z } from 'zod';
import { REVIEW_STEP_COUNT, practiceConfidences } from './operations.ts';
import type { PracticeConfidence } from './operations.ts';

export type PracticeInputError =
  | 'invalid_choreography_ids'
  | 'invalid_date'
  | 'invalid_confidence'
  | 'invalid_song'
  | 'invalid_note'
  | 'invalid_step'
  | 'invalid_spread'
  | 'invalid_limit';

export const MAX_BATCH_SIZE = 100;
export const DEFAULT_LOG_LIMIT = 100;
export const MAX_LOG_LIMIT = 500;
export const MAX_BASELINE_SIZE = 1000;

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  });

const positiveId = z.number().int().positive();

const logSchema = z
  .object({
    choreography_ids: z.array(positiveId).min(1).max(MAX_BATCH_SIZE),
    practiced_on: calendarDate.optional(),
    confidence: z.enum(practiceConfidences).default('sure'),
    song_id: positiveId.nullish(),
    note: z
      .string()
      .max(500)
      .nullish()
      .transform((value) => value?.trim() || null),
  })
  .refine((input) => input.song_id == null || new Set(input.choreography_ids).size === 1, {
    path: ['song_id'],
  });

const baselineSchema = z.object({
  choreography_ids: z.array(positiveId).min(1).max(MAX_BASELINE_SIZE),
  step: z.number().int().min(1).max(REVIEW_STEP_COUNT),
  spread: z.boolean().default(true),
});

const limitSchema = z.preprocess(
  (value) => (value === undefined ? DEFAULT_LOG_LIMIT : Number(value)),
  z.number().int().min(1).max(MAX_LOG_LIMIT),
);

export type LogPracticeInput = {
  choreography_ids: number[];
  practiced_on: string | null;
  confidence: PracticeConfidence;
  song_id: number | null;
  note: string | null;
};
export type LogPracticeValidationResult =
  { error: PracticeInputError } | { value: LogPracticeInput };
export type LogListValidationResult = { error: PracticeInputError } | { value: { limit: number } };

const issueErrors: Record<string, PracticeInputError> = {
  choreography_ids: 'invalid_choreography_ids',
  practiced_on: 'invalid_date',
  confidence: 'invalid_confidence',
  song_id: 'invalid_song',
  note: 'invalid_note',
  step: 'invalid_step',
  spread: 'invalid_spread',
};

export function validateLogPractice(input: unknown): LogPracticeValidationResult {
  const result = logSchema.safeParse(input);
  if (!result.success) {
    const field = String(result.error.issues[0]?.path[0] ?? 'choreography_ids');
    return { error: issueErrors[field] ?? 'invalid_choreography_ids' };
  }
  const { choreography_ids, practiced_on, confidence, song_id, note } = result.data;
  return {
    value: {
      choreography_ids: [...new Set(choreography_ids)],
      practiced_on: practiced_on ?? null,
      confidence,
      song_id: song_id ?? null,
      note,
    },
  };
}

export function validateLogList(input: unknown): LogListValidationResult {
  const record =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const result = limitSchema.safeParse(record.limit);
  return result.success ? { value: { limit: result.data } } : { error: 'invalid_limit' };
}

export function validateEntryId(rawId: string): { error: 'invalid_id' } | { value: number } {
  return /^\d+$/.test(rawId) && Number(rawId) > 0
    ? { value: Number(rawId) }
    : { error: 'invalid_id' };
}

export type BaselineInput = { choreography_ids: number[]; step: number; spread: boolean };
export type BaselineValidationResult = { error: PracticeInputError } | { value: BaselineInput };

export function validateBaseline(input: unknown): BaselineValidationResult {
  const result = baselineSchema.safeParse(input);
  if (!result.success) {
    const field = String(result.error.issues[0]?.path[0] ?? 'choreography_ids');
    return { error: issueErrors[field] ?? 'invalid_choreography_ids' };
  }
  const { choreography_ids, step, spread } = result.data;
  return { value: { choreography_ids: [...new Set(choreography_ids)], step, spread } };
}
