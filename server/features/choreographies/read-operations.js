import { normalizeStringArray } from '../../utils/choreographyNormalization.ts';

export function parsePagination(query) {
  const page = Number.parseInt(query.page, 10) || 1;
  const limit = Number.parseInt(query.limit, 10) || 20;
  return { page, limit, offset: (page - 1) * limit };
}

export function formatPage(data, { page, limit }, total) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export function formatSearchResults(data) {
  const total = data.length;
  return { data, pagination: { page: 1, limit: total, total, totalPages: total > 0 ? 1 : 0 } };
}

export function normalizeDuplicateQuery(query) {
  const rawAuthors = query.authors;
  let authorValues = [];
  if (Array.isArray(rawAuthors)) authorValues = rawAuthors;
  else if (rawAuthors) authorValues = [rawAuthors];
  const authors = normalizeStringArray(authorValues);
  if (!query.name || !query.level || authors.length === 0) return null;
  const parsed = Number.parseInt(query.exclude_id, 10);
  const excludeId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  return { name: query.name, level: query.level, excludeId, authors };
}

export function combineChoreography(row, authors, tags, figures, information, rating) {
  return {
    ...row,
    authors: authors.map((author) => author.name),
    tags: tags.map((tag) => tag.name),
    step_figures: figures.map((figure) => figure.name),
    choreography_information: information,
    rating: rating ? rating.rating : null,
  };
}
