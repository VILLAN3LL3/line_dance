import { describe, expect, it } from 'vitest';
import {
  normalizeIdArray,
  normalizeNonNegativeInteger,
  normalizeStringArray,
} from '../../utils/choreographyNormalization.ts';

describe('shared choreography normalization', () => {
  it('preserves string coercion and integer parsing', () => {
    expect(normalizeNonNegativeInteger([12])).toBe(12);
    expect(normalizeNonNegativeInteger('3.5')).toBe(3);
    expect(normalizeNonNegativeInteger(-1)).toBeNull();
    expect(normalizeNonNegativeInteger(Symbol('x'))).toBeNull();
    expect(() => normalizeNonNegativeInteger({ toString: null })).toThrow(TypeError);
  });

  it('normalizes arrays without changing order or coercion', () => {
    expect(normalizeStringArray([' A ', 2, '', 'B'])).toEqual(['A', 'B']);
    expect(normalizeIdArray(['2suffix', 2, [3], -1, 'bad'])).toEqual([2, 3]);
  });
});
