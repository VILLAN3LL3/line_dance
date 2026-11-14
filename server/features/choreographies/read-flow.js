import {
  combineChoreography,
  formatPage,
  formatSearchResults,
  normalizeDuplicateQuery,
  parsePagination,
} from './read-operations.js';
import {
  expandStepFigureNames,
  normalizeMatchMode,
  normalizeUniqueTextQueryParam,
} from './search-operations.js';
import * as repository from './read-repository.js';

async function enrichChoreography(choreography) {
  const authors = await repository.findAuthors(choreography.id);
  const tags = await repository.findTags(choreography.id);
  const figures = await repository.findStepFigures(choreography.id);
  const information = await repository.findInformation(choreography.id);
  const rating = await repository.findRating(choreography.id);
  return combineChoreography(choreography, authors, tags, figures, information, rating);
}

export async function listChoreographies(query) {
  const pagination = parsePagination(query);
  const rows = await repository.listChoreographies(pagination.limit, pagination.offset);
  const data = await Promise.all(rows.map(enrichChoreography));
  const count = await repository.countChoreographies();
  return formatPage(data, pagination, count.count);
}

export async function getChoreography(id) {
  const row = await repository.findChoreography(id);
  return row ? { value: await enrichChoreography(row) } : { error: 'not_found' };
}

export async function checkDuplicates(query) {
  const criteria = normalizeDuplicateQuery(query);
  if (!criteria) return [];
  const rows = await repository.findDuplicates(criteria);
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      authors: (await repository.findAuthors(row.id)).map((author) => author.name),
    })),
  );
}

export async function searchChoreographies(query) {
  const requested = normalizeUniqueTextQueryParam(query.step_figures);
  const relations = requested.length ? await repository.listFigureRelations() : [];
  const mode = normalizeMatchMode(query.step_figures_match_mode);
  const step_figures = expandStepFigureNames(requested, relations, mode === 'exact');
  const rows = await repository.searchChoreographies({ ...query, step_figures });
  const data = await Promise.all(rows.map(enrichChoreography));
  return formatSearchResults(data);
}
