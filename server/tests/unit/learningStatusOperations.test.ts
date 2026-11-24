import { describe, expect, it } from 'vitest';
import {
  isValidLearningStatusChange,
  normalizeLearningStatusChange,
  parseLearningStatus,
} from '../../features/learning-status/operations.ts';
import { validateLearningStatus } from '../../features/learning-status/validation.ts';

describe('learning status operations', () => {
  it('parses only the two known statuses', () => {
    expect(parseLearningStatus('wishlist')).toBe('wishlist');
    expect(parseLearningStatus('learned')).toBe('learned');
    expect(parseLearningStatus('Learned')).toBeNull();
    expect(parseLearningStatus(undefined)).toBeNull();
  });

  it('keeps the status when omitted and clears it for null or an empty string', () => {
    expect(normalizeLearningStatusChange(undefined)).toBeUndefined();
    expect(normalizeLearningStatusChange(null)).toBeNull();
    expect(normalizeLearningStatusChange('')).toBeNull();
    expect(normalizeLearningStatusChange('wishlist')).toBe('wishlist');
  });

  it('accepts only omitted, empty or known values as a change', () => {
    expect(isValidLearningStatusChange(undefined)).toBe(true);
    expect(isValidLearningStatusChange(null)).toBe(true);
    expect(isValidLearningStatusChange('')).toBe(true);
    expect(isValidLearningStatusChange('learned')).toBe(true);
    expect(isValidLearningStatusChange('sure')).toBe(false);
    expect(isValidLearningStatusChange(1)).toBe(false);
  });

  it('validates the request body of the status endpoint', () => {
    expect(validateLearningStatus({ status: 'learned' })).toEqual({ value: 'learned' });
    expect(validateLearningStatus({ status: 'x' })).toEqual({ error: 'invalid_status' });
    expect(validateLearningStatus(undefined)).toEqual({ error: 'invalid_status' });
  });
});
