import { z } from 'zod';
import type { Choreography, DuplicateChoreography } from '../../contracts/api.ts';
import { combineChoreography, formatPage, formatSearchResults } from './read-operations.ts';
import type { Page, Pagination } from './read-operations.ts';
import type { ChoreographyReadId, DuplicateInput, SearchQuery } from './read-validation.ts';
import {
  expandStepFigureNames,
  normalizeMatchMode,
  normalizeUniqueTextQueryParam,
} from './search-operations.ts';
import * as repository from './read-repository.ts';
import type { ChoreographyRow } from './read-repository.ts';

export type { Choreography, DuplicateChoreography } from '../../contracts/api.ts';

const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);
const optionalInteger = z
  .int()
  .nullish()
  .transform((value) => value ?? undefined);
const choreographyResponse = z.looseObject({
  id: z.number(),
  name: z.string(),
  level: z.string(),
  official_level: z.string(),
  personal_level: z.string().nullable(),
  step_sheet_link: optionalText,
  demo_video_url: optionalText,
  tutorial_video_url: optionalText,
  count: optionalInteger,
  wall_count: optionalInteger,
  creation_year: optionalInteger,
  song: optionalText,
  artist: optionalText,
  created_at: z.string(),
  updated_at: z.string(),
  authors: z.array(z.string()),
  tags: z.array(z.string()),
  step_figures: z.array(z.string()),
  choreography_information: z.array(
    z.object({
      id: z.number(),
      category: z.string(),
      description: z.string(),
    }),
  ),
  rating: z.number().nullable(),
});

async function enrichChoreography(choreography: ChoreographyRow): Promise<Choreography> {
  const authors = await repository.findAuthors(choreography.id);
  const tags = await repository.findTags(choreography.id);
  const figures = await repository.findStepFigures(choreography.id);
  const information = await repository.findInformation(choreography.id);
  const rating = await repository.findRating(choreography.id);
  return choreographyResponse.parse(
    combineChoreography(choreography, authors, tags, figures, information, rating),
  );
}

export async function listChoreographies(pagination: Pagination): Promise<Page<Choreography>> {
  const rows = await repository.listChoreographies(pagination.limit, pagination.offset);
  const data = await Promise.all(rows.map(enrichChoreography));
  const count = await repository.countChoreographies();
  if (!count) throw new Error('Choreography count not found');
  return formatPage(data, pagination, count.count);
}

export async function getChoreography(
  id: ChoreographyReadId,
): Promise<{ value: Choreography } | { error: 'not_found' }> {
  const row = await repository.findChoreography(id);
  return row ? { value: await enrichChoreography(row) } : { error: 'not_found' };
}

export async function checkDuplicates({
  value: criteria,
}: DuplicateInput): Promise<DuplicateChoreography[]> {
  if (!criteria) return [];
  const rows = await repository.findDuplicates(criteria);
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      authors: (await repository.findAuthors(row.id)).map((author) => author.name),
    })),
  );
}

export async function searchChoreographies(query: SearchQuery): Promise<Page<Choreography>> {
  const requested = normalizeUniqueTextQueryParam(query.step_figures);
  const relations = requested.length ? await repository.listFigureRelations() : [];
  const mode = normalizeMatchMode(query.step_figures_match_mode);
  const step_figures = expandStepFigureNames(requested, relations, mode === 'exact');
  const rows = await repository.searchChoreographies({ ...query, step_figures });
  const data = await Promise.all(rows.map(enrichChoreography));
  return formatSearchResults(data);
}
