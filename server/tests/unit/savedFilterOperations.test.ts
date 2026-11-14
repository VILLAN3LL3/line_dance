import { describe, expect, it } from 'vitest';
import {
  parseStoredFilters,
  prepareConfigurationSave,
  prepareConfigurationUpdate,
  validateConfigurationId,
  validateConfigurationName,
} from '../../features/saved-filters/operations.ts';

describe('saved filter operations', () => {
  it('validates configuration IDs and names', () => {
    expect(validateConfigurationId('12')).toEqual({ value: 12 });
    expect(validateConfigurationId('no')).toEqual({ error: 'invalid_id' });
    expect(validateConfigurationName('  Name  ')).toEqual({ value: 'Name' });
    expect(validateConfigurationName('  ')).toEqual({ error: 'name_required' });
  });

  it('validates update intent and preserves the existing name when omitted', () => {
    expect(prepareConfigurationUpdate({})).toEqual({ error: 'nothing_to_update' });
    expect(prepareConfigurationUpdate({ name: '' })).toEqual({ error: 'name_required' });
    expect(prepareConfigurationUpdate({ filters: {} })).toEqual({
      value: { filters: {} },
    });
    expect(prepareConfigurationUpdate({ name: ' New ' })).toEqual({
      value: { name: 'New' },
    });
  });

  it('validates names before normalizing filters', () => {
    const invalidFilters = { max_count: { toString: null } };
    expect(prepareConfigurationSave({ name: '', filters: invalidFilters })).toEqual({
      error: 'name_required',
    });
    expect(prepareConfigurationUpdate({ name: '', filters: invalidFilters })).toEqual({
      error: 'name_required',
    });
    expect(prepareConfigurationSave({ name: ' X ', filters: { min_rating: [3] } })).toEqual({
      value: { name: 'X', filters: { min_rating: 3 } },
    });
    expect(prepareConfigurationSave({ name: 7 })).toEqual({ error: 'name_required' });
    expect(prepareConfigurationUpdate({ name: 7, filters: invalidFilters })).toEqual({
      error: 'name_required',
    });
    expect(prepareConfigurationUpdate([])).toEqual({ error: 'nothing_to_update' });
  });

  it('normalizes valid stored JSON and exposes malformed JSON to the caller', () => {
    expect(parseStoredFilters('{"search":"  Dance  "}')).toEqual({ search: 'Dance' });
    expect(() => parseStoredFilters('{invalid')).toThrow(SyntaxError);
  });
});
