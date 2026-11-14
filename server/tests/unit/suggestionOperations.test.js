import { describe, expect, it } from 'vitest';
import {
  currentSuggestionDate,
  knownFigureNames,
  parseMaxLevel,
  uniqueIds,
  validatePositiveId,
} from '../../features/suggestions/operations.js';

describe('suggestion operations', () => {
  it('validates positive identifiers and preserves existing integer parsing', () => {
    expect(validatePositiveId('2', 'invalid_id')).toEqual({ value: 2 });
    expect(validatePositiveId('0', 'invalid_id')).toEqual({ error: 'invalid_id' });
    expect(validatePositiveId('no', 'invalid_id')).toEqual({ error: 'invalid_id' });
  });

  it('treats missing or negative level limits as unrestricted', () => {
    expect(parseMaxLevel(undefined)).toBeNull();
    expect(parseMaxLevel('-1')).toBeNull();
    expect(parseMaxLevel('0')).toBe(0);
    expect(parseMaxLevel('20')).toBe(20);
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
});
