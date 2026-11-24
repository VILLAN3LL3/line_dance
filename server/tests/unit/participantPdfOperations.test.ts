import { describe, expect, it } from 'vitest';
import {
  computeLearnedSteps,
  formatCountWall,
  formatSessionDate,
  getTrainerSignature,
  groupDancesBySession,
} from '../../features/courses/participant-pdf-operations.ts';
import { getCoursePdfFileName } from '../../features/courses/pdf-operations.ts';

describe('participant PDF operations', () => {
  it('formats session dates independent of the time zone', () => {
    expect(formatSessionDate('2025-01-15')).toBe('Mi, 15.01.2025');
    expect(formatSessionDate('2025-12-31T23:30:00')).toBe('Mi, 31.12.2025');
    expect(formatSessionDate('invalid')).toBe('invalid');
  });

  it('formats count and wall and omits missing parts', () => {
    expect(formatCountWall(32, 4)).toBe('32 Count / 4 Wall');
    expect(formatCountWall('64', null)).toBe('64 Count');
    expect(formatCountWall(null, 2)).toBe('2 Wall');
    expect(formatCountWall(null, null)).toBeNull();
  });

  it('groups dances by session, keeps empty sessions and ignores unknown dances', () => {
    const dances = new Map([
      [1, { id: 1, name: 'A' }],
      [2, { id: 2, name: 'B' }],
    ]);
    expect(
      groupDancesBySession(
        [
          { id: 10, session_date: '2025-01-01' },
          { id: 11, session_date: '2025-01-08' },
        ],
        [
          { session_id: 10, choreography_id: 2 },
          { session_id: 10, choreography_id: 1 },
          { session_id: 10, choreography_id: 99 },
        ],
        dances,
      ),
    ).toEqual([
      { session_date: '2025-01-01', dances: [dances.get(2), dances.get(1)] },
      { session_date: '2025-01-08', dances: [] },
    ]);
  });

  it('lists only unknown steps once, case-insensitively and sorted', () => {
    expect(
      computeLearnedSteps(['Vine', 'rocking chair', 'Rocking Chair', 'Kick', 'Zig'], ['kick']),
    ).toEqual(['rocking chair', 'Vine', 'Zig']);
    expect(computeLearnedSteps([], ['kick'])).toEqual([]);
  });

  it('builds the trainer signature from the gender', () => {
    expect(getTrainerSignature('Jane', 'female')).toBe('Deine Jane');
    expect(getTrainerSignature(' Jan ', 'male')).toBe('Dein Jan');
    expect(getTrainerSignature('Alex', 'diverse')).toBe('Alex');
    expect(getTrainerSignature('Alex', null)).toBe('Alex');
    expect(getTrainerSignature(null, 'female')).toBeNull();
  });

  it('uses a distinct file name prefix', () => {
    expect(getCoursePdfFileName({ course_id: 3, semester: 'WS 25' }, 'Kursabschluss')).toBe(
      'Kursabschluss-3-WS_25.pdf',
    );
  });
});
