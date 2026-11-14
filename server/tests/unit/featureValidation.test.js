import { describe, expect, it } from 'vitest';
import { validateTrainer } from '../../features/trainers/validation.js';
import { validateChoreographyId, validateRating } from '../../features/ratings/validation.js';
import {
  hasTrainerId,
  validateCourseUpdate,
  validateNewCourse,
} from '../../features/courses/validation.js';
import {
  validateBaseFigureGroupId,
  validateBaseFigureIds,
  validateGroupName,
  validateMaxLevel,
  validateMaxLevelGroupId,
} from '../../features/groups/validation.js';

describe('trainer validation', () => {
  it('reports the first missing field and trims valid values', () => {
    expect(validateTrainer({ name: ' ', phone: '', email: '' })).toEqual({
      error: 'name_required',
    });

    expect(validateTrainer({ name: ' Jane ', phone: '', email: '' })).toEqual({
      error: 'phone_required',
    });
    expect(validateTrainer({ name: ' Jane ', phone: ' 1 ', email: '' })).toEqual({
      error: 'email_required',
    });
    expect(validateTrainer({ name: ' Jane ', phone: ' 1 ', email: ' a@b.test ' })).toEqual({
      value: { name: 'Jane', phone: '1', email: 'a@b.test' },
    });
  });
});

describe('rating validation', () => {
  it('parses choreography IDs and rejects non-numeric IDs', () => {
    expect(validateChoreographyId('12')).toEqual({ value: 12 });
    expect(validateChoreographyId('invalid')).toEqual({ error: 'invalid_id' });
  });

  it('accepts ratings from zero to five and rejects missing and out-of-range values', () => {
    expect(validateRating({ rating: 0 })).toEqual({ value: 0 });
    expect(validateRating({ rating: '5' })).toEqual({ value: 5 });
    expect(validateRating({ rating: 6 })).toEqual({ error: 'invalid_rating' });
    expect(validateRating({ rating: -1 })).toEqual({ error: 'invalid_rating' });
    expect(validateRating({})).toEqual({ error: 'invalid_rating' });
  });
});

describe('course validation', () => {
  it('validates required group and identity and normalizes optional fields', () => {
    expect(validateNewCourse({ name: '' })).toEqual({ error: 'group_required' });
    expect(validateNewCourse({ dance_group_id: 1, name: ' ' })).toEqual({
      error: 'course_identity_required',
    });
    expect(validateNewCourse({ dance_group_id: 1, name: ' Course ', trainer_id: '2' })).toEqual({
      value: {
        course_id: null,
        name: 'Course',
        dance_group_id: 1,
        semester: '',
        start_date: null,
        youtube_playlist_url: null,
        copperknob_list_url: null,
        spotify_playlist_url: null,
        trainer_id: 2,
      },
    });
  });

  it('preserves omitted identity fields and rejects clearing both', () => {
    const existing = { course_id: 7, name: 'Original' };
    expect(validateCourseUpdate({ name: ' New ' }, existing).value).toMatchObject({
      course_id: 7,
      name: 'New',
    });
    expect(validateCourseUpdate({ course_id: null, name: '' }, existing)).toEqual({
      error: 'course_identity_required',
    });
  });

  it('recognizes supplied trainer identifiers', () => {
    expect([null, undefined, ''].map(hasTrainerId)).toEqual([false, false, false]);
    expect([0, '0', 2].map(hasTrainerId)).toEqual([true, true, true]);
  });
});

describe('group validation', () => {
  it('requires a nonblank group name and trims it', () => {
    expect(validateGroupName({ name: 7 })).toEqual({ error: 'name_required' });
    expect(validateGroupName({ name: ' Group ' })).toEqual({ value: 'Group' });
  });

  it('keeps the existing distinct ID rules for levels and base figures', () => {
    expect(validateMaxLevelGroupId('0')).toEqual({ value: 0 });
    expect(validateMaxLevelGroupId('invalid')).toEqual({ error: 'valid_group_id_required' });
    expect(validateBaseFigureGroupId('0')).toEqual({ error: 'invalid_group_id' });
    expect(validateBaseFigureGroupId('5')).toEqual({ value: 5 });
  });

  it('normalizes empty max levels and rejects negative values', () => {
    expect(validateMaxLevel({ max_group_level_value: '' })).toEqual({ value: null });
    expect(validateMaxLevel({ max_group_level_value: '2' })).toEqual({ value: 2 });
    expect(validateMaxLevel({ max_group_level_value: -1 })).toEqual({ error: 'invalid_max_level' });
  });

  it('accepts empty or positive integer figure lists only', () => {
    expect(validateBaseFigureIds({ step_figure_ids: [] })).toEqual({ value: [] });
    expect(validateBaseFigureIds({ step_figure_ids: [1, 2] })).toEqual({ value: [1, 2] });
    expect(validateBaseFigureIds({ step_figure_ids: [1, '2'] })).toEqual({
      error: 'invalid_figure_ids',
    });
  });
});
