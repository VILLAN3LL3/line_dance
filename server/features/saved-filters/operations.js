import {
  normalizeNonNegativeInteger,
  normalizeStringArray,
  normalizeStringField,
} from '../../utils/choreographyNormalization.js';

function assignNonEmptyArray(target, key, rawValue) {
  const arr = normalizeStringArray(rawValue);
  if (arr.length > 0) target[key] = arr;
}

export function normalizeSavedFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) return {};

  const normalized = {};
  const search = normalizeStringField(rawFilters.search);
  if (search) normalized.search = search;
  const songArtist = normalizeStringField(rawFilters.song_artist);
  if (songArtist) normalized.song_artist = songArtist;
  const level = normalizeStringArray(rawFilters.level);
  if (level.length > 0) normalized.level = level;

  const maxLevel = normalizeNonNegativeInteger(rawFilters.max_level_value);
  if (maxLevel !== null) normalized.max_level_value = maxLevel;

  assignNonEmptyArray(normalized, 'step_figures', rawFilters.step_figures);
  if (['all', 'any', 'exact'].includes(rawFilters.step_figures_match_mode)) {
    normalized.step_figures_match_mode = rawFilters.step_figures_match_mode;
  }
  if (rawFilters.without_step_figures === true) normalized.without_step_figures = true;
  assignNonEmptyArray(normalized, 'required_step_figures', rawFilters.required_step_figures);

  const tags = normalizeStringArray(rawFilters.tags);
  if (tags.length > 0) normalized.tags = tags;
  const excludedTags = normalizeStringArray(rawFilters.excluded_tags).filter(
    (tag) => !tags.includes(tag),
  );
  if (excludedTags.length > 0) normalized.excluded_tags = excludedTags;
  assignNonEmptyArray(normalized, 'authors', rawFilters.authors);

  const maxCount = Number.parseInt(String(rawFilters.max_count), 10);
  if (!Number.isNaN(maxCount) && maxCount >= 0) normalized.max_count = maxCount;
  const minRating = Number.parseInt(String(rawFilters.min_rating), 10);
  if (!Number.isNaN(minRating) && minRating >= 0 && minRating <= 5) {
    normalized.min_rating = minRating;
  }
  return normalized;
}

export function validateConfigurationId(id) {
  const value = Number.parseInt(id, 10);
  return Number.isNaN(value) ? { error: 'invalid_id' } : { value };
}

export function validateConfigurationName(rawName) {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  return name ? { value: name } : { error: 'name_required' };
}

export function validateConfigurationUpdate(input, existingName) {
  const hasName = Object.hasOwn(input || {}, 'name');
  const hasFilters = Object.hasOwn(input || {}, 'filters');
  if (!hasName && !hasFilters) return { error: 'nothing_to_update' };
  const name = hasName ? validateConfigurationName(input?.name) : { value: existingName };
  if (name.error) return name;
  return { value: { name: name.value, hasFilters } };
}

export function parseStoredFilters(storedValue) {
  return normalizeSavedFilters(JSON.parse(storedValue || '{}'));
}
