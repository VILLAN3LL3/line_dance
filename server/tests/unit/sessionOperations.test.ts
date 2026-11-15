import { describe, expect, it } from 'vitest';
import {
  hasOverlappingCourse,
  planRearrangement,
  serializeAssignment,
} from '../../features/sessions/operations.ts';
import {
  validateAssignment,
  validateNewSession,
  validateReorder,
  validateSessionId,
  validateSessionUpdate,
  validateSwap,
} from '../../features/sessions/validation.ts';

describe('session validation operations', () => {
  it('requires course and date and normalizes a missing comment', () => {
    expect(validateNewSession({ dance_course_id: 1 })).toEqual({
      error: 'course_and_date_required',
    });

    expect(validateNewSession({ dance_course_id: 1, session_date: '2026-01-01' })).toEqual({
      value: { dance_course_id: 1, session_date: '2026-01-01', comment: null },
    });
    expect(validateSessionUpdate({})).toEqual({ error: 'date_required' });
    expect(validateSessionUpdate({ session_date: '2026-01-01', comment: '' })).toEqual({
      value: { session_date: '2026-01-01', comment: '' },
    });
  });

  it('requires an ISO date and retains the other truthy input and numeric-prefix rules', () => {
    expect(validateNewSession({ dance_course_id: [1], session_date: 42, comment: 0 })).toEqual({
      error: 'invalid_session_date',
    });
    expect(validateSessionUpdate({ session_date: '2026-02-30' })).toEqual({
      error: 'invalid_session_date',
    });
    expect(validateAssignment({ session_id: 0, choreography_id: 1 })).toEqual({
      error: 'assignment_ids_required',
    });
    expect(validateSwap('12suffix', '-3')).toEqual({ value: [12, -3] });
    expect(() => validateNewSession(null)).toThrow(TypeError);
    expect(validateReorder(null)).toEqual({ error: 'invalid_reorder_ids' });
  });

  it('requires session and choreography identifiers for assignments', () => {
    expect(validateSessionId('')).toEqual({ error: 'session_id_required' });
    expect(validateSessionId('4')).toEqual({ value: '4' });
    expect(validateAssignment({ session_id: 1 })).toEqual({ error: 'assignment_ids_required' });
    expect(validateAssignment({ session_id: 1, choreography_id: 2 })).toEqual({
      value: { session_id: 1, choreography_id: 2 },
    });
  });

  it('requires distinct positive safe integers for reordering', () => {
    for (const ids of [[], [1], [1, 1], [1, 0], [1, '2'], [1, Number.MAX_SAFE_INTEGER + 1]]) {
      expect(validateReorder({ session_ids: ids })).toEqual({ error: 'invalid_reorder_ids' });
    }
    expect(validateReorder({ session_ids: [3, 1, 2] })).toEqual({ value: [3, 1, 2] });
  });

  it('parses distinct IDs for swapping using the existing API rules', () => {
    expect(validateSwap('12', '13')).toEqual({ value: [12, 13] });
    expect(validateSwap('12', '12')).toEqual({ error: 'invalid_swap_ids' });
    expect(validateSwap('invalid', '12')).toEqual({ error: 'invalid_swap_ids' });
  });
});

describe('course date ranges', () => {
  it('detects inclusive overlaps, including enclosing ranges, but permits separate ranges', () => {
    const dates = [
      { dance_course_id: 1, session_date: '2026-01-10' },
      { dance_course_id: 1, session_date: '2026-01-20' },
      { dance_course_id: 2, session_date: '2026-01-01' },
    ];
    expect(hasOverlappingCourse(2, '2026-01-10', dates)).toBe(true);
    expect(hasOverlappingCourse(2, '2026-01-30', dates)).toBe(true);
    expect(hasOverlappingCourse(2, '2026-01-09', dates)).toBe(false);
    expect(hasOverlappingCourse(3, '2026-02-01', dates)).toBe(false);
    expect(hasOverlappingCourse(1, '2026-01-11', [])).toBe(false);
  });
});

describe('session content operations', () => {
  it('converts stored assignment flags to booleans', () => {
    expect(serializeAssignment({ id: 1, is_new: 1, auto_repeat: 0 })).toEqual({
      id: 1,
      is_new: true,
      auto_repeat: false,
    });
  });

  it('maps reordered or swapped source contents to the correct targets', () => {
    const sessions = [
      { id: 1, dance_course_id: 8 },
      { id: 2, dance_course_id: 8 },
      { id: 3, dance_course_id: 8 },
    ];
    expect(planRearrangement([3, 1, 2], sessions, 'reorder')).toEqual({
      value: {
        courseId: 8,
        targets: new Map([
          [3, 1],
          [1, 2],
          [2, 3],
        ]),
      },
    });
    expect(planRearrangement([2, 1], sessions.slice(0, 2), 'swap')).toEqual({
      value: {
        courseId: 8,
        targets: new Map([
          [2, 1],
          [1, 2],
        ]),
      },
    });
  });

  it('rejects missing sessions and sessions from different courses', () => {
    expect(planRearrangement([1, 2], [{ id: 1, dance_course_id: 1 }], 'swap')).toEqual({
      error: 'session_not_found',
    });
    expect(
      planRearrangement(
        [1, 2],
        [
          { id: 1, dance_course_id: 1 },
          { id: 2, dance_course_id: 2 },
        ],
        'swap',
      ),
    ).toEqual({ error: 'different_course' });
  });
});
