import { z } from 'zod';
import { normalizeNonNegativeInteger } from '../../utils/choreographyNormalization.ts';

type QueryValue = string | { [key: string]: QueryValue } | QueryValue[];
const queryValue: z.ZodType<QueryValue> = z.lazy(() =>
  z.union([z.string(), z.record(z.string(), queryValue), z.array(queryValue)]),
);
const idSchema = z.number().refine((value) => Number.isInteger(value) && value > 0);
const suggestionRequest = z.object({ groupId: z.string(), maxLevel: z.unknown().optional() });
const sessionRequest = z.object({ sessionId: z.string() });

export type Suggestion = {
  step_figure: string;
  step_figures: string[];
  additional_choreographies: number;
};
export type SuggestionIdError = 'invalid_group_id' | 'invalid_session_id';
export type IdResult<E extends SuggestionIdError> = { error: E } | { value: number };
export type GroupRequest =
  { error: 'invalid_group_id' } | { value: { id: number; maxLevel: number | null } };
export type SessionRequest = IdResult<'invalid_session_id'>;

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

export function prepareSessionSuggestion(input: unknown): SessionRequest {
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

export function aggregateSuggestions(
  rows: { choreography_id: number; missing_figure: string }[],
): Suggestion[] {
  const missingByChoreography = new Map<number, string[]>();
  for (const row of rows) {
    const figures = missingByChoreography.get(row.choreography_id) ?? [];
    if (!figures.some((figure) => figure.toLowerCase() === row.missing_figure.toLowerCase())) {
      figures.push(row.missing_figure);
      missingByChoreography.set(row.choreography_id, figures);
    }
  }

  const counts = new Map<string, { figures: string[]; count: number }>();
  for (const figures of missingByChoreography.values()) {
    const sorted = [...figures].sort((a, b) => a.localeCompare(b));
    if (sorted.length === 1) {
      const key = sorted[0].toLowerCase();
      const existing = counts.get(key);
      counts.set(key, { figures: sorted, count: (existing?.count ?? 0) + 1 });
    } else if (sorted.length === 2) {
      const key = sorted.map((figure) => figure.toLowerCase()).join('|');
      const existing = counts.get(key);
      counts.set(key, { figures: sorted, count: (existing?.count ?? 0) + 1 });
    }
  }

  return [...counts.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.figures.length - b.figures.length ||
        a.figures.join(' + ').localeCompare(b.figures.join(' + ')),
    )
    .slice(0, 5)
    .map(({ figures, count }) => ({
      step_figure: figures.join(' + '),
      step_figures: figures,
      additional_choreographies: count,
    }));
}
