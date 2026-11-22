import { z } from 'zod';
import {
  normalizeNonNegativeInteger,
  normalizeStringArray,
  normalizeStringField,
} from '../../utils/choreographyNormalization.ts';

const matchModeSchema = z.enum(['all', 'any', 'exact']);
const nameSchema = z.string().trim().min(1).brand<'ConfigurationName'>();
const saveBodySchema = z.object({
  name: nameSchema,
  filters: z.unknown().optional(),
});
const updateBodySchema = z.object({
  name: z.unknown().optional(),
  filters: z.unknown().optional(),
});
const stringField = z.preprocess(normalizeStringField, z.string());
const stringArray = z.preprocess(normalizeStringArray, z.array(z.string()));
const nonNegativeInteger = z.preprocess(
  normalizeNonNegativeInteger,
  z.custom<number | null>((value) => value === null || typeof value === 'number'),
);
const filterFieldsSchema = z.object({
  search: stringField,
  song_artist: stringField,
  level: stringArray,
  max_level_value: nonNegativeInteger,
  step_figures: stringArray,
  step_figures_match_mode: matchModeSchema.optional().catch(undefined),
  without_step_figures: z.literal(true).optional().catch(undefined),
  use_official_level: z.literal(true).optional().catch(undefined),
  required_step_figures: stringArray,
  tags: stringArray,
  excluded_tags: stringArray,
  authors: stringArray,
  max_count: nonNegativeInteger,
  min_rating: nonNegativeInteger,
});

type FilterFields = z.output<typeof filterFieldsSchema>;
export type SavedFilters = { [K in keyof FilterFields]?: NonNullable<FilterFields[K]> };

type ArrayField = 'step_figures' | 'required_step_figures' | 'authors';
type ConfigurationName = z.output<typeof nameSchema>;
type NameResult = { error: 'name_required' } | { value: ConfigurationName };
export type SaveInput =
  { error: 'name_required' } | { value: { name: ConfigurationName; filters: SavedFilters } };
export type UpdateInput =
  | { error: 'nothing_to_update' | 'name_required' }
  | {
      value:
        | { name: ConfigurationName; filters?: SavedFilters }
        | { name?: never; filters: SavedFilters };
    };

function assignNonEmptyArray(target: SavedFilters, key: ArrayField, values: string[]): void {
  if (values.length > 0) target[key] = values;
}

export function normalizeSavedFilters(rawFilters: unknown): SavedFilters {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) return {};
  const parsed = filterFieldsSchema.parse(rawFilters);
  const normalized: SavedFilters = {};
  if (parsed.search) normalized.search = parsed.search;
  if (parsed.song_artist) normalized.song_artist = parsed.song_artist;
  if (parsed.level.length > 0) normalized.level = parsed.level;

  if (parsed.max_level_value !== null) normalized.max_level_value = parsed.max_level_value;

  assignNonEmptyArray(normalized, 'step_figures', parsed.step_figures);
  if (parsed.step_figures_match_mode) {
    normalized.step_figures_match_mode = parsed.step_figures_match_mode;
  }
  if (parsed.without_step_figures) normalized.without_step_figures = true;
  if (parsed.use_official_level) normalized.use_official_level = true;
  assignNonEmptyArray(normalized, 'required_step_figures', parsed.required_step_figures);

  const tags = parsed.tags;
  if (tags.length > 0) normalized.tags = tags;
  const excludedTags = parsed.excluded_tags.filter((tag) => !tags.includes(tag));
  if (excludedTags.length > 0) normalized.excluded_tags = excludedTags;
  assignNonEmptyArray(normalized, 'authors', parsed.authors);

  if (parsed.max_count !== null) normalized.max_count = parsed.max_count;
  if (parsed.min_rating !== null && parsed.min_rating <= 5) {
    normalized.min_rating = parsed.min_rating;
  }
  return normalized;
}

export function validateConfigurationId(id: string): { error: 'invalid_id' } | { value: number } {
  const value = Number.parseInt(id, 10);
  return Number.isNaN(value) ? { error: 'invalid_id' } : { value };
}

export function validateConfigurationName(rawName: unknown): NameResult {
  const name = nameSchema.safeParse(rawName);
  return name.success ? { value: name.data } : { error: 'name_required' };
}

export function prepareConfigurationSave(input: unknown): SaveInput {
  const result = saveBodySchema.safeParse(input);
  if (!result.success) return { error: 'name_required' };
  return {
    value: {
      name: result.data.name,
      filters: normalizeSavedFilters(result.data.filters || {}),
    },
  };
}

export function prepareConfigurationUpdate(input: unknown): UpdateInput {
  const result = updateBodySchema.safeParse(input);
  if (!result.success) return { error: 'nothing_to_update' };
  const fields = result.data;
  const hasName = Object.hasOwn(fields, 'name');
  const hasFilters = Object.hasOwn(fields, 'filters');
  if (!hasName && !hasFilters) return { error: 'nothing_to_update' };

  if (hasName) {
    const name = validateConfigurationName(fields.name);
    if ('error' in name) return name;
    if (hasFilters) {
      return { value: { name: name.value, filters: normalizeSavedFilters(fields.filters || {}) } };
    }
    return { value: { name: name.value } };
  }
  return { value: { filters: normalizeSavedFilters(fields.filters || {}) } };
}

export function parseStoredFilters(storedValue: string): SavedFilters {
  const parsed: unknown = JSON.parse(storedValue || '{}');
  return normalizeSavedFilters(parsed);
}
