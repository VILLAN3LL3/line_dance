import { z } from 'zod';
import { normalizeNonNegativeInteger } from '../../utils/choreographyNormalization.ts';

type QueryValue = string | { [key: string]: QueryValue } | QueryValue[];
const queryValue: z.ZodType<QueryValue> = z.lazy(() =>
  z.union([z.string(), z.record(z.string(), queryValue), z.array(queryValue)]),
);
const idSchema = z.number().refine((value) => Number.isInteger(value) && value > 0);
const suggestionRequest = z.object({ groupId: z.string(), maxLevel: z.unknown().optional() });
const sessionRequest = z.object({ sessionId: z.string() });

export type Suggestion = { step_figure: string; additional_choreographies: number };
export type SuggestionIdError = 'invalid_group_id' | 'invalid_session_id';
export type IdResult<E extends SuggestionIdError> = { error: E } | { value: number };
export type GroupRequest =
  { error: 'invalid_group_id' } | { value: { id: number; maxLevel: number | null } };

export function validatePositiveId<E extends SuggestionIdError>(
  value: string,
  error: E,
): IdResult<E> {
  const parsed = Number.parseInt(value, 10);
  return idSchema.safeParse(parsed).success ? { value: parsed } : { error };
}

export function parseMaxLevel(value: unknown): number | null {
  return normalizeNonNegativeInteger(value);
}

export function prepareGroupSuggestion(input: unknown): GroupRequest {
  const { groupId: rawId, maxLevel } = suggestionRequest.parse(input);
  const id = validatePositiveId(rawId, 'invalid_group_id');
  if ('error' in id) return id;
  return { value: { id: id.value, maxLevel: parseMaxLevel(maxLevel) } };
}

export function prepareSessionSuggestion(input: unknown): IdResult<'invalid_session_id'> {
  return validatePositiveId(sessionRequest.parse(input).sessionId, 'invalid_session_id');
}

export function prepareLearnedGroupId(input: unknown): { value: QueryValue | undefined } {
  return { value: queryValue.optional().parse(input) };
}

export function currentSuggestionDate(now: number): string {
  return new Date(now + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function uniqueIds(...groups: number[][]): number[] {
  return [...new Set(groups.flat())];
}

export function knownFigureNames(rows: { name: string }[]): {
  names: string[];
  namesLower: string[];
} {
  return {
    names: [...new Set(rows.map((row) => row.name))],
    namesLower: [...new Set(rows.map((row) => row.name.toLowerCase()))],
  };
}
