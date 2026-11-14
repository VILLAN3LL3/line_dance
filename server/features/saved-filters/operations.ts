import { z } from 'zod';
import {
  normalizeNonNegativeInteger,
  normalizeStringArray,
  normalizeStringField,
} from '../../utils/choreographyNormalization.ts';

const matchModeSchema = z.enum(['all', 'any', 'exact']);

export interface SavedFilters {
  search?: string;
  song_artist?: string;
  level?: string[];
  max_level_value?: number;
  step_figures?: string[];
  step_figures_match_mode?: z.output<typeof matchModeSchema>;
  without_step_figures?: true;
  required_step_figures?: string[];
  tags?: string[];
  excluded_tags?: string[];
  authors?: string[];
  max_count?: number;
  min_rating?: number;
}

type ArrayField = 'step_figures' | 'required_step_figures' | 'authors';
type NameResult = { error: 'name_required' } | { value: string };
type UpdateResult =
  | { error: 'nothing_to_update' | 'name_required' }
  | { value: { name: string; hasFilters: boolean } };

function assignNonEmptyArray(target: SavedFilters, key: ArrayField, rawValue: unknown): void {
  const arr = normalizeStringArray(rawValue);
  if (arr.length > 0) target[key] = arr;
}

function isFilterObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeSavedFilters(rawFilters: unknown): SavedFilters {
  if (!isFilterObject(rawFilters)) return {};
  const raw = rawFilters;
  const normalized: SavedFilters = {};
  const search = normalizeStringField(raw.search);
  if (search) normalized.search = search;
  const songArtist = normalizeStringField(raw.song_artist);
  if (songArtist) normalized.song_artist = songArtist;
  const level = normalizeStringArray(raw.level);
  if (level.length > 0) normalized.level = level;

  const maxLevel = normalizeNonNegativeInteger(raw.max_level_value);
  if (maxLevel !== null) normalized.max_level_value = maxLevel;

  assignNonEmptyArray(normalized, 'step_figures', raw.step_figures);
  const matchMode = matchModeSchema.safeParse(raw.step_figures_match_mode);
  if (matchMode.success) normalized.step_figures_match_mode = matchMode.data;
  if (raw.without_step_figures === true) normalized.without_step_figures = true;
  assignNonEmptyArray(normalized, 'required_step_figures', raw.required_step_figures);

  const tags = normalizeStringArray(raw.tags);
  if (tags.length > 0) normalized.tags = tags;
  const excludedTags = normalizeStringArray(raw.excluded_tags).filter((tag) => !tags.includes(tag));
  if (excludedTags.length > 0) normalized.excluded_tags = excludedTags;
  assignNonEmptyArray(normalized, 'authors', raw.authors);

  const maxCount = normalizeNonNegativeInteger(raw.max_count);
  if (maxCount !== null) normalized.max_count = maxCount;
  const minRating = normalizeNonNegativeInteger(raw.min_rating);
  if (minRating !== null && minRating <= 5) {
    normalized.min_rating = minRating;
  }
  return normalized;
}

export function validateConfigurationId(id: string): { error: 'invalid_id' } | { value: number } {
  const value = Number.parseInt(id, 10);
  return Number.isNaN(value) ? { error: 'invalid_id' } : { value };
}

export function validateConfigurationName(rawName: unknown): NameResult {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  return name ? { value: name } : { error: 'name_required' };
}

export function validateConfigurationUpdate(input: unknown, existingName: string): UpdateResult {
  const fields: Record<string, unknown> = Object(input || {});
  const hasName = Object.hasOwn(fields, 'name');
  const hasFilters = Object.hasOwn(fields, 'filters');
  if (!hasName && !hasFilters) return { error: 'nothing_to_update' };
  const name = hasName ? validateConfigurationName(fields.name) : { value: existingName };
  if ('error' in name) return name;
  return { value: { name: name.value, hasFilters } };
}

export function parseStoredFilters(storedValue: string): SavedFilters {
  const parsed: unknown = JSON.parse(storedValue || '{}');
  return normalizeSavedFilters(parsed);
}
