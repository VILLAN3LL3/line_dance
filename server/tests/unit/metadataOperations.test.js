import { describe, expect, it } from 'vitest';
import {
  authorStatistics,
  countryCodeMap,
  nextLevelValue,
  validateLevelName,
  validateLevelValue,
} from '../../features/metadata/operations.js';

describe('metadata operations', () => {
  it('validates names and optional numeric values', () => {
    expect(validateLevelName({ name: ' ' })).toEqual({ error: 'name_required' });
    expect(validateLevelName({ name: ' New ' })).toEqual({ value: 'New' });
    expect(validateLevelValue('')).toEqual({ value: null });
    expect(validateLevelValue('15')).toEqual({ value: 15 });
    expect(validateLevelValue('no')).toEqual({ error: 'invalid_value' });
    expect(nextLevelValue(20)).toBe(30);
    expect(nextLevelValue(null)).toBe(10);
  });

  it('aggregates choreography counts by author and level', () => {
    expect(
      authorStatistics([
        { author_name: 'A', level_name: 'Beginner', count: '2' },
        { author_name: 'A', level_name: 'Advanced', count: 1 },
        { author_name: 'B', level_name: null, count: 1 },
      ]),
    ).toEqual([
      { name: 'A', total: 3, by_level: { Beginner: 2, Advanced: 1 } },
      { name: 'B', total: 1, by_level: {} },
    ]);
  });

  it('maps both country codes and lets community aliases take precedence', () => {
    expect(
      countryCodeMap(
        [{ iso_2_code: 'IE', iso_3_code: 'IRL', name: 'Ireland' }],
        [
          { alias: 'IRE', name: 'Ireland' },
          { alias: 'IE', name: 'Alias' },
        ],
      ),
    ).toEqual({ IE: 'Alias', IRL: 'Ireland', IRE: 'Ireland' });
  });
});
