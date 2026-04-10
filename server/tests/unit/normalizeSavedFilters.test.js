import { describe, it, expect } from 'vitest';
import { normalizeSavedFilters } from '../../routes/choreographies.js';

describe('normalizeSavedFilters', () => {
  // ---------------------------------------------------------------------------
  // Invalid inputs
  // ---------------------------------------------------------------------------

  it('returns empty object for null', () => {
    expect(normalizeSavedFilters(null)).toEqual({});
  });

  it('returns empty object for undefined', () => {
    expect(normalizeSavedFilters(undefined)).toEqual({});
  });

  it('returns empty object for a non-object primitive', () => {
    expect(normalizeSavedFilters('string')).toEqual({});
    expect(normalizeSavedFilters(42)).toEqual({});
  });

  it('returns empty object for an array', () => {
    expect(normalizeSavedFilters([])).toEqual({});
    expect(normalizeSavedFilters(['Beginner'])).toEqual({});
  });

  it('returns empty object for an empty object', () => {
    expect(normalizeSavedFilters({})).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // search
  // ---------------------------------------------------------------------------

  it('keeps a non-empty trimmed search string', () => {
    expect(normalizeSavedFilters({ search: '  Tango  ' })).toEqual({ search: 'Tango' });
  });

  it('omits search when it is an empty string', () => {
    expect(normalizeSavedFilters({ search: '' })).toEqual({});
  });

  it('omits search when it is whitespace-only', () => {
    expect(normalizeSavedFilters({ search: '   ' })).toEqual({});
  });

  it('omits search when it is not a string', () => {
    expect(normalizeSavedFilters({ search: 123 })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // level
  // ---------------------------------------------------------------------------

  it('keeps a non-empty level array', () => {
    expect(normalizeSavedFilters({ level: ['Beginner', 'Advanced'] })).toEqual({
      level: ['Beginner', 'Advanced'],
    });
  });

  it('filters empty strings out of the level array', () => {
    expect(normalizeSavedFilters({ level: ['Beginner', '', '  '] })).toEqual({
      level: ['Beginner'],
    });
  });

  it('keeps a non-negative max_level_value', () => {
    expect(normalizeSavedFilters({ max_level_value: 20 })).toEqual({ max_level_value: 20 });
  });

  it('parses max_level_value from a numeric string', () => {
    expect(normalizeSavedFilters({ max_level_value: '30' })).toEqual({ max_level_value: 30 });
  });

  it('omits max_level_value when it is negative or invalid', () => {
    expect(normalizeSavedFilters({ max_level_value: -1 })).toEqual({});
    expect(normalizeSavedFilters({ max_level_value: 'hard' })).toEqual({});
  });

  it('omits level when the array is empty', () => {
    expect(normalizeSavedFilters({ level: [] })).toEqual({});
  });

  it('omits level when it is not an array', () => {
    expect(normalizeSavedFilters({ level: 'Beginner' })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // step_figures
  // ---------------------------------------------------------------------------

  it('keeps a non-empty step_figures array', () => {
    expect(normalizeSavedFilters({ step_figures: ['Cha Cha', 'Mambo'] })).toEqual({
      step_figures: ['Cha Cha', 'Mambo'],
    });
  });

  it('omits step_figures when the array is empty after filtering', () => {
    expect(normalizeSavedFilters({ step_figures: ['', '  '] })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // step_figures_match_mode
  // ---------------------------------------------------------------------------

  it('keeps "all" as step_figures_match_mode', () => {
    expect(normalizeSavedFilters({ step_figures_match_mode: 'all' })).toEqual({
      step_figures_match_mode: 'all',
    });
  });

  it('keeps "any" as step_figures_match_mode', () => {
    expect(normalizeSavedFilters({ step_figures_match_mode: 'any' })).toEqual({
      step_figures_match_mode: 'any',
    });
  });

  it('keeps "exact" as step_figures_match_mode', () => {
    expect(normalizeSavedFilters({ step_figures_match_mode: 'exact' })).toEqual({
      step_figures_match_mode: 'exact',
    });
  });

  it('omits step_figures_match_mode for an unrecognised value', () => {
    expect(normalizeSavedFilters({ step_figures_match_mode: 'fuzzy' })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // without_step_figures
  // ---------------------------------------------------------------------------

  it('keeps without_step_figures when exactly true', () => {
    expect(normalizeSavedFilters({ without_step_figures: true })).toEqual({
      without_step_figures: true,
    });
  });

  it('omits without_step_figures for the string "true"', () => {
    expect(normalizeSavedFilters({ without_step_figures: 'true' })).toEqual({});
  });

  it('omits without_step_figures when false', () => {
    expect(normalizeSavedFilters({ without_step_figures: false })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // tags
  // ---------------------------------------------------------------------------

  it('keeps a non-empty tags array', () => {
    expect(normalizeSavedFilters({ tags: ['fun', 'competition'] })).toEqual({
      tags: ['fun', 'competition'],
    });
  });

  it('omits tags when the array is empty', () => {
    expect(normalizeSavedFilters({ tags: [] })).toEqual({});
  });

  it('keeps excluded_tags when they are provided', () => {
    expect(normalizeSavedFilters({ excluded_tags: ['holiday', 'novice'] })).toEqual({
      excluded_tags: ['holiday', 'novice'],
    });
  });

  it('removes excluded_tags that also exist in tags', () => {
    expect(normalizeSavedFilters({ tags: ['classic'], excluded_tags: ['classic', 'fun'] })).toEqual(
      {
        tags: ['classic'],
        excluded_tags: ['fun'],
      },
    );
  });

  // ---------------------------------------------------------------------------
  // authors
  // ---------------------------------------------------------------------------

  it('keeps a non-empty authors array', () => {
    expect(normalizeSavedFilters({ authors: ['Jane Smith'] })).toEqual({ authors: ['Jane Smith'] });
  });

  it('omits authors when the array is empty', () => {
    expect(normalizeSavedFilters({ authors: [] })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // max_count
  // ---------------------------------------------------------------------------

  it('keeps a non-negative integer max_count', () => {
    expect(normalizeSavedFilters({ max_count: 32 })).toEqual({ max_count: 32 });
  });

  it('keeps max_count of 0', () => {
    expect(normalizeSavedFilters({ max_count: 0 })).toEqual({ max_count: 0 });
  });

  it('parses max_count from a numeric string', () => {
    expect(normalizeSavedFilters({ max_count: '16' })).toEqual({ max_count: 16 });
  });

  it('omits max_count for a negative number', () => {
    expect(normalizeSavedFilters({ max_count: -1 })).toEqual({});
  });

  it('omits max_count for NaN', () => {
    expect(normalizeSavedFilters({ max_count: Number.NaN })).toEqual({});
  });

  it('omits max_count for a non-numeric string', () => {
    expect(normalizeSavedFilters({ max_count: 'lots' })).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // Multiple fields together
  // ---------------------------------------------------------------------------

  it('normalizes a realistic multi-field filter object', () => {
    const input = {
      search: ' Tango ',
      level: ['Beginner'],
      max_level_value: 10,
      step_figures: ['Cha Cha'],
      step_figures_match_mode: 'any',
      tags: ['fun'],
      excluded_tags: ['holiday'],
      authors: ['Jane'],
      max_count: 32,
    };
    expect(normalizeSavedFilters(input)).toEqual({
      search: 'Tango',
      level: ['Beginner'],
      max_level_value: 10,
      step_figures: ['Cha Cha'],
      step_figures_match_mode: 'any',
      tags: ['fun'],
      excluded_tags: ['holiday'],
      authors: ['Jane'],
      max_count: 32,
    });
  });

  it('strips unknown/extra fields from the input', () => {
    const result = normalizeSavedFilters({ search: 'Waltz', unknown: 'value', extra: true });
    expect(result).toEqual({ search: 'Waltz' });
    expect(result).not.toHaveProperty('unknown');
  });
});
