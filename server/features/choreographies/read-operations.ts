import { normalizeStringArray } from "../../utils/choreographyNormalization.ts";
import { stringifyQueryValue } from "./search-operations.ts";

import type { JsonValue } from '../../utils/json-input.ts';
import type { QueryValue } from './search-operations.ts';

export type Pagination = { page: number; limit: number; offset: number };
export type DuplicateCriteria = {
  name: JsonValue;
  level: JsonValue;
  excludeId: number | null;
  authors: string[];
};
export type Page<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
type DuplicateQuery = {
  name?: QueryValue;
  level?: QueryValue;
  authors?: QueryValue;
  exclude_id?: QueryValue;
};

export function parsePagination(query: { page?: QueryValue; limit?: QueryValue }): Pagination {
  const page = Number.parseInt(stringifyQueryValue(query.page), 10) || 1;
  const limit = Number.parseInt(stringifyQueryValue(query.limit), 10) || 20;
  return { page, limit, offset: (page - 1) * limit };
}

export function formatPage<T>(data: T[], { page, limit }: Pagination, total: number): Page<T> {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export function formatSearchResults<T>(data: T[]): Page<T> {
  const total = data.length;
  return { data, pagination: { page: 1, limit: total, total, totalPages: total > 0 ? 1 : 0 } };
}

export function normalizeDuplicateQuery(query: DuplicateQuery): DuplicateCriteria | null {
  const rawAuthors = query.authors;
  let authorValues: JsonValue[] = [];
  if (Array.isArray(rawAuthors)) authorValues = rawAuthors;
  else if (rawAuthors) authorValues = [rawAuthors];
  const authors = normalizeStringArray(authorValues);
  if (!query.name || !query.level || authors.length === 0) return null;
  const parsed = Number.parseInt(stringifyQueryValue(query.exclude_id), 10);
  const excludeId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  return { name: query.name, level: query.level, excludeId, authors };
}

export function combineChoreography<T extends object, I extends object, S extends object>(
  row: T,
  authors: { name: string }[],
  tags: { name: string }[],
  figures: { name: string }[],
  information: I[],
  songs: S[],
  rating: { rating: number } | undefined,
): T & {
  authors: string[];
  tags: string[];
  step_figures: string[];
  choreography_information: I[];
  choreography_songs: S[];
  rating: number | null;
} {
  return {
    ...row,
    authors: authors.map((author) => author.name),
    tags: tags.map((tag) => tag.name),
    step_figures: figures.map((figure) => figure.name),
    choreography_information: information,
    choreography_songs: songs,
    rating: rating ? rating.rating : null,
  };
}
