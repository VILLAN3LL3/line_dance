import { describe, expect, it } from 'vitest';
import { validateTrainer } from '../../features/trainers/validation.ts';
import { validateChoreographyId, validateRating } from '../../features/ratings/validation.ts';
import {
  hasTrainerId,
  prepareCourseInput,
  prepareNewCourse,
  validateCourseUpdate,
  validateNewCourse,
} from '../../features/courses/validation.ts';
import {
  validateBaseFigureGroupId,
  validateBaseFigureIds,
  validateGroupName,
  validateMaxLevel,
  validateMaxLevelGroupId,
  prepareBaseFiguresUpdate,
  prepareMaxLevelUpdate,
} from '../../features/groups/validation.ts';

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
      value: { name: 'Jane', phone: '1', email: 'a@b.test', gender: null },
    });
  });

  it('accepts a known gender, treats null as unspecified and rejects anything else', () => {
    const base = { name: 'Jane', phone: '1', email: 'a@b.test' };
    expect(validateTrainer({ ...base, gender: 'female' })).toEqual({
      value: { ...base, gender: 'female' },
    });
    expect(validateTrainer({ ...base, gender: null })).toEqual({
      value: { ...base, gender: null },
    });
    expect(validateTrainer({ ...base, gender: 'x' })).toEqual({ error: 'invalid_gender' });
  });

  it('rejects invalid field types in field order without coercing them', () => {
    expect(validateTrainer({ name: 7, phone: [], email: null })).toEqual({
      error: 'name_required',
    });
    expect(validateTrainer({ name: 'Jane', phone: 123, email: '' })).toEqual({
      error: 'phone_required',
    });
    expect(validateTrainer({ name: 'Jane', phone: '1', email: ['a@b.test'] })).toEqual({
      error: 'email_required',
    });
    expect(validateTrainer([])).toEqual({ error: 'name_required' });
    expect(() => validateTrainer(undefined)).toThrow(TypeError);
  });
});

describe('rating validation', () => {
  it('parses choreography IDs and rejects non-numeric IDs', () => {
    expect(validateChoreographyId('12')).toEqual({ value: 12 });
    expect(validateChoreographyId('12suffix')).toEqual({ value: 12 });
    expect(validateChoreographyId('invalid')).toEqual({ error: 'invalid_id' });
  });

  it('accepts ratings from zero to five and rejects missing and out-of-range values', () => {
    expect(validateRating({ rating: 0 })).toEqual({ value: 0 });
    expect(validateRating({ rating: '5' })).toEqual({ value: 5 });
    expect(validateRating({ rating: '2.5' })).toEqual({ value: 2 });
    expect(validateRating({ rating: [3] })).toEqual({ value: 3 });
    expect(validateRating(null)).toEqual({ error: 'invalid_rating' });
    expect(validateRating({ rating: 6 })).toEqual({ error: 'invalid_rating' });
    expect(validateRating({ rating: -1 })).toEqual({ error: 'invalid_rating' });
    expect(validateRating({})).toEqual({ error: 'invalid_rating' });
  });

  it('retains the existing conversion of JSON input and rejects invalid structures', () => {
    expect(validateRating({ rating: ['3', 'ignored'] })).toEqual({ value: 3 });
    expect(validateRating({ rating: '4suffix' })).toEqual({ value: 4 });
    expect(validateRating({ rating: true })).toEqual({ error: 'invalid_rating' });
    expect(validateRating({ rating: {} })).toEqual({ error: 'invalid_rating' });
    expect(validateRating([])).toEqual({ error: 'invalid_rating' });
    expect(() => validateRating({ rating: { toString: null } })).toThrow(TypeError);
  });
});

describe('course validation', () => {
  it('validates required group and identity and normalizes optional fields', () => {
    expect(validateNewCourse(prepareCourseInput({ name: '' }))).toEqual({
      error: 'group_required',
    });
    expect(validateNewCourse(prepareCourseInput({ dance_group_id: 1, name: ' ' }))).toEqual({
      error: 'course_identity_required',
    });
    expect(
      validateNewCourse(
        prepareCourseInput({ dance_group_id: 1, name: ' Course ', trainer_id: '2' }),
      ),
    ).toEqual({
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
    expect(validateCourseUpdate(prepareCourseInput({ name: ' New ' }), existing)).toMatchObject({
      value: {
        course_id: 7,
        name: 'New',
      },
    });
    expect(
      validateCourseUpdate(prepareCourseInput({ course_id: null, name: '' }), existing),
    ).toEqual({
      error: 'course_identity_required',
    });
  });

  it('recognizes supplied trainer identifiers', () => {
    expect([null, undefined, ''].map(hasTrainerId)).toEqual([false, false, false]);
    expect([0, '0', 2].map(hasTrainerId)).toEqual([true, true, true]);
  });

  it('preserves legacy coercion and reports conversion errors before missing-group errors', () => {
    expect(
      prepareNewCourse({ dance_group_id: 1, course_id: ['12suffix'] }).validation,
    ).toMatchObject({ value: { course_id: 12 } });
    expect(() => prepareNewCourse({ course_id: { toString: null } })).toThrow(TypeError);
    expect(prepareNewCourse({ dance_group_id: 1, course_id: true }).validation).toMatchObject({
      value: { course_id: NaN },
    });
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

  it('preserves coercion and validation precedence for group updates', () => {
    expect(validateMaxLevel({ max_group_level_value: '12suffix' })).toEqual({ value: 12 });
    expect(validateMaxLevel({ max_group_level_value: [3] })).toEqual({ value: 3 });
    expect(validateBaseFigureIds({ step_figure_ids: [9007199254740992] })).toEqual({
      value: [9007199254740992],
    });
    expect(
      prepareMaxLevelUpdate({
        groupId: 'invalid',
        body: { max_group_level_value: { toString: null } },
      }),
    ).toEqual({
      error: 'valid_group_id_required',
    });
    expect(() =>
      prepareMaxLevelUpdate({ groupId: '1', body: { max_group_level_value: { toString: null } } }),
    ).toThrow(TypeError);
    const prepared = prepareBaseFiguresUpdate({ groupId: '1', body: null });
    if ('error' in prepared) throw new Error('Expected valid group ID');
    expect(prepared.value.figures).toEqual({ exception: expect.any(TypeError) });
  });
});
