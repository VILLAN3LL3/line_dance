import { describe, expect, it } from 'vitest';
import {
  aggregateSuggestions,
  currentSuggestionDate,
  knownFigureNames,
  parseMaxLevel,
  prepareGroupSuggestion,
  prepareLearnedGroupId,
  prepareSessionSuggestion,
  uniqueIds,
  validatePositiveId,
} from '../../features/suggestions/operations.ts';

describe('suggestion operations', () => {
  it('validates positive identifiers and preserves existing integer parsing', () => {
    expect(validatePositiveId('2suffix', 'invalid_group_id')).toEqual({ value: 2 });
    expect(validatePositiveId('0', 'invalid_group_id')).toEqual({ error: 'invalid_group_id' });
    expect(validatePositiveId('no', 'invalid_group_id')).toEqual({ error: 'invalid_group_id' });
    expect(validatePositiveId('9007199254740992', 'invalid_group_id')).toEqual({
      value: 9007199254740992,
    });
    expect(validatePositiveId('9'.repeat(400), 'invalid_group_id')).toEqual({
      error: 'invalid_group_id',
    });
  });

  it('treats missing or negative level limits as unrestricted', () => {
    expect(parseMaxLevel(undefined)).toBeNull();
    expect(parseMaxLevel('-1')).toBeNull();
    expect(parseMaxLevel('0')).toBe(0);
    expect(parseMaxLevel('20')).toBe(20);
  });

  it('prepares query input without changing coercion or ID error precedence', () => {
    expect(prepareGroupSuggestion({ groupId: '4x', maxLevel: ['2'] })).toEqual({
      value: { id: 4, maxLevel: 2 },
    });
    const invalidLevel = { toString: null };
    expect(prepareGroupSuggestion({ groupId: '0', maxLevel: invalidLevel })).toEqual({
      error: 'invalid_group_id',
    });
    expect(() => prepareGroupSuggestion({ groupId: '4', maxLevel: invalidLevel })).toThrow(
      TypeError,
    );
    expect(prepareSessionSuggestion({ sessionId: '3suffix' })).toEqual({ value: 3 });
    expect(prepareLearnedGroupId(['1', '2'])).toEqual({ value: ['1', '2'] });
    expect(prepareLearnedGroupId({ nested: '1' })).toEqual({ value: { nested: '1' } });
  });

  it('uses the existing UTC+2 date cutoff', () => {
    expect(currentSuggestionDate(Date.parse('2026-01-01T22:30:00Z'))).toBe('2026-01-02');
    expect(currentSuggestionDate(Date.parse('2026-01-01T21:30:00Z'))).toBe('2026-01-01');
  });

  it('deduplicates IDs and names while preserving display names', () => {
    expect(uniqueIds([1, 2], [2, 3])).toEqual([1, 2, 3]);
    expect(knownFigureNames([{ name: 'Kick' }, { name: 'kick' }, { name: 'Kick' }])).toEqual({
      names: ['Kick', 'kick'],
      namesLower: ['kick'],
    });
  });

  it('aggregates one and two unknown step figures and sorts them by coverage', () => {
    expect(
      aggregateSuggestions([
        { choreography_id: 1, missing_figure: 'Rock' },
        { choreography_id: 2, missing_figure: 'Rock' },
        { choreography_id: 3, missing_figure: 'Vine' },
        { choreography_id: 3, missing_figure: 'Turn' },
        { choreography_id: 4, missing_figure: 'Vine' },
        { choreography_id: 4, missing_figure: 'Turn' },
      ]),
    ).toEqual([
      { step_figure: 'Rock', step_figures: ['Rock'], additional_choreographies: 2 },
      { step_figure: 'Turn + Vine', step_figures: ['Turn', 'Vine'], additional_choreographies: 2 },
    ]);
  });
});
