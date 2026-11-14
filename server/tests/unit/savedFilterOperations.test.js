import { describe, expect, it } from 'vitest';
import {
  parseStoredFilters,
  validateConfigurationId,
  validateConfigurationName,
  validateConfigurationUpdate,
} from '../../features/saved-filters/operations.js';

describe('saved filter operations', () => {
  it('validates configuration IDs and names', () => {
    expect(validateConfigurationId('12')).toEqual({ value: 12 });
    expect(validateConfigurationId('no')).toEqual({ error: 'invalid_id' });
    expect(validateConfigurationName('  Name  ')).toEqual({ value: 'Name' });
    expect(validateConfigurationName('  ')).toEqual({ error: 'name_required' });
  });

  it('validates update intent and preserves the existing name when omitted', () => {
    expect(validateConfigurationUpdate({}, 'Old')).toEqual({ error: 'nothing_to_update' });
    expect(validateConfigurationUpdate({ name: '' }, 'Old')).toEqual({ error: 'name_required' });
    expect(validateConfigurationUpdate({ filters: {} }, 'Old')).toEqual({
      value: { name: 'Old', hasFilters: true },
    });
    expect(validateConfigurationUpdate({ name: ' New ' }, 'Old')).toEqual({
      value: { name: 'New', hasFilters: false },
    });
  });

  it('normalizes valid stored JSON and exposes malformed JSON to the caller', () => {
    expect(parseStoredFilters('{"search":"  Dance  "}')).toEqual({ search: 'Dance' });
    expect(() => parseStoredFilters('{invalid')).toThrow(SyntaxError);
  });
});
