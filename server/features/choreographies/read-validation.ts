import { z } from 'zod';
import { jsonInput } from '../../utils/json-input.ts';
import { normalizeDuplicateQuery, parsePagination } from './read-operations.ts';
import type { DuplicateCriteria, Pagination } from './read-operations.ts';

const queryValue = jsonInput.optional();
const paginationQuery = z.object({ page: queryValue, limit: queryValue });
const duplicateQuery = z.object({
  name: queryValue,
  level: queryValue,
  authors: queryValue,
  exclude_id: queryValue,
});
const searchQuery = z
  .object({
    search: queryValue,
    song_artist: queryValue,
    level: queryValue,
    max_level_value: queryValue,
    step_figures: queryValue,
    step_figures_match_mode: queryValue,
    without_step_figures: queryValue,
    required_step_figures: queryValue,
    tags: queryValue,
    excluded_tags: queryValue,
    authors: queryValue,
    min_rating: queryValue,
    use_official_level: queryValue,
  })
  .brand<'ChoreographySearchQuery'>();
const idParams = z.object({ id: z.string().brand<'ChoreographyReadId'>() });

export type SearchQuery = z.output<typeof searchQuery>;
export type ChoreographyReadId = z.output<typeof idParams>['id'];
export type DuplicateInput = { value: DuplicateCriteria | null };

export function preparePagination(input: unknown): Pagination {
  return parsePagination(paginationQuery.parse(input));
}

export function prepareDuplicateQuery(input: unknown): DuplicateInput {
  return { value: normalizeDuplicateQuery(duplicateQuery.parse(input)) };
}

export function prepareSearchQuery(input: unknown): SearchQuery {
  return searchQuery.parse(input);
}

export function prepareChoreographyReadId(input: unknown): { value: ChoreographyReadId } {
  return { value: idParams.parse(input).id };
}
