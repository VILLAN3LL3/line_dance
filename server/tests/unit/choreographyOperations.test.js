import { describe, expect, it } from 'vitest';
import { getChoreographyFieldIssues } from '../../features/choreographies/validation.js';
import {
  normalizeChoreographyInformation,
  prepareChoreography,
} from '../../features/choreographies/write-operations.js';
import {
  combineChoreography,
  formatPage,
  formatSearchResults,
  normalizeDuplicateQuery,
  parsePagination,
} from '../../features/choreographies/read-operations.js';
import {
  expandStepFigureNames,
  normalizeMatchMode,
  normalizeUniqueTextQueryParam,
} from '../../features/choreographies/search-operations.js';
import { buildFilterConditions } from '../../features/choreographies/search-query.js';

describe('choreography operations', () => {
  it('collects field issues in their existing order and supports partial updates', () => {
    expect(
      getChoreographyFieldIssues({
        name: '',
        level: '',
        step_sheet_link: 'invalid',
        choreography_information: [{ category: '', description: 'text' }],
      }),
    ).toEqual([
      { field: 'step_sheet_link', key: 'invalid_url' },
      { field: 'choreography_information.0.category', key: 'required' },
      { field: 'name', key: 'required' },
      { field: 'level', key: 'required' },
    ]);
    expect(getChoreographyFieldIssues({}, { partial: true })).toEqual([]);
  });

  it('normalizes information and preserves omitted relationships on updates', () => {
    expect(
      normalizeChoreographyInformation([{ category: ' Tag ', description: ' Text ' }]),
    ).toEqual([{ category: 'Tag', description: 'Text' }]);
    expect(normalizeChoreographyInformation('invalid')).toBeNull();
    expect(prepareChoreography({ name: 'Dance', count: 0 })).toMatchObject({
      name: 'Dance',
      count: null,
      information: undefined,
      authors: undefined,
    });
  });

  it('normalizes duplicate checks and preserves list and search pagination contracts', () => {
    expect(normalizeDuplicateQuery({ name: 'Dance', level: 'Beginner' })).toBeNull();
    expect(
      normalizeDuplicateQuery({
        name: 'Dance',
        level: 'Beginner',
        authors: ' Jane ',
        exclude_id: '2',
      }),
    ).toEqual({ name: 'Dance', level: 'Beginner', authors: ['Jane'], excludeId: 2 });
    const pagination = parsePagination({ page: '2', limit: '3' });
    expect(pagination).toEqual({ page: 2, limit: 3, offset: 3 });
    expect(formatPage(['x'], pagination, 7).pagination).toEqual({
      page: 2,
      limit: 3,
      total: 7,
      totalPages: 3,
    });
    expect(formatSearchResults([]).pagination).toEqual({
      page: 1,
      limit: 0,
      total: 0,
      totalPages: 0,
    });
  });

  it('combines related rows without losing ordering or nullable ratings', () => {
    expect(
      combineChoreography(
        { id: 1 },
        [{ name: 'Author' }],
        [{ name: 'Tag' }],
        [{ name: 'Kick' }],
        [{ category: 'Intro', description: 'Text' }],
        { rating: 0 },
      ),
    ).toEqual({
      id: 1,
      authors: ['Author'],
      tags: ['Tag'],
      step_figures: ['Kick'],
      choreography_information: [{ category: 'Intro', description: 'Text' }],
      rating: 0,
    });
  });
});

describe('choreography search operations', () => {
  const relations = [
    { parent_name: 'Parent', child_name: 'A' },
    { parent_name: 'Parent', child_name: 'B' },
    { parent_name: 'Parent', child_name: 'C' },
    { parent_name: 'Grandparent', child_name: 'Parent' },
    { parent_name: 'Grandparent', child_name: 'D' },
  ];

  it('deduplicates case-insensitively and expands hierarchy according to match mode', () => {
    expect(normalizeUniqueTextQueryParam([' A ', 'a', 'B'])).toEqual(['A', 'B']);
    expect(normalizeMatchMode(['any', ' EXACT '])).toBe('exact');
    expect(normalizeMatchMode('invalid')).toBe('all');
    expect(expandStepFigureNames(['A', 'B', 'D'], relations, false)).toEqual([
      'A',
      'B',
      'D',
      'Parent',
      'Grandparent',
    ]);
    expect(expandStepFigureNames(['A', 'B', 'D'], relations, true)).toEqual(['A', 'B', 'D']);
  });

  it('keeps exact-match having parameters separate from other filter parameters', () => {
    const result = buildFilterConditions({
      step_figures: ['Kick', 'kick', 'Mambo'],
      step_figures_match_mode: 'exact',
      tags: ['Fun'],
      min_rating: '3',
    });
    expect(result.params).toEqual(['Fun', 3]);
    expect(result.stepFilter.havingParams).toEqual(['Kick', 'Mambo']);
    expect(result.stepFilter.groupBy).toBe(' GROUP BY c.id');
  });
});
