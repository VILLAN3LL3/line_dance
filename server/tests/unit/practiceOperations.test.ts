import { describe, expect, it } from 'vitest';
import {
  MAINTENANCE_INTERVAL_DAYS,
  REVIEW_INTERVAL_TIERS,
  formatLocalDate,
  intervalDaysForLevel,
  isFutureDate,
  planBaseline,
  REVIEW_STEP_COUNT,
  reviewIntervalDays,
  summarizePractice,
} from '../../features/practice/operations.ts';
import type { PracticeRow } from '../../features/practice/operations.ts';
import {
  validateBaseline,
  validateEntryId,
  validateLogList,
  validateLogPractice,
} from '../../features/practice/validation.ts';

const today = '2026-11-24';

function entry(
  choreographyId: number,
  id: number,
  practicedOn: string,
  confidence: 'sure' | 'unsure' = 'sure',
  levelValue = 30,
): PracticeRow {
  return {
    choreography_id: choreographyId,
    entry_id: id,
    practiced_on: practicedOn,
    confidence,
    note: null,
    step: null,
    due_on: null,
    level_value: levelValue,
  };
}

function never(choreographyId: number): PracticeRow {
  return {
    choreography_id: choreographyId,
    entry_id: null,
    practiced_on: null,
    confidence: null,
    note: null,
    step: null,
    due_on: null,
    level_value: 30,
  };
}

describe('review intervals', () => {
  it('grows slowly with each sure practice up to half a year and stays there', () => {
    const sure = (count: number): ('sure' | 'unsure')[] => Array(count).fill('sure');
    expect(
      [1, 2, 3, 4, 5, 6, 7, 8, 40].map((count) => reviewIntervalDays(sure(count), 30)),
    ).toEqual([1, 2, 4, 7, 10, 14, 21, 30, 182]);
  });

  it('starts again after an unsure practice', () => {
    expect(reviewIntervalDays(['sure', 'sure', 'sure', 'unsure'], 30)).toBe(1);
    expect(reviewIntervalDays(['sure', 'sure', 'unsure', 'sure'], 30)).toBe(1);
    expect(reviewIntervalDays(['unsure', 'sure', 'sure'], 30)).toBe(2);
  });

  it('repeats higher levels more often', () => {
    const fourSure = Array<'sure'>(4).fill('sure');
    expect([30, 70, 110, 150].map((level) => reviewIntervalDays(fourSure, level))).toEqual([
      7, 5, 4, 3,
    ]);
  });

  it('picks the tier by the level value, including its upper bound', () => {
    expect(intervalDaysForLevel(0)).toEqual(intervalDaysForLevel(40));
    expect(intervalDaysForLevel(41)).toEqual(intervalDaysForLevel(80));
    expect(intervalDaysForLevel(81)).toEqual(intervalDaysForLevel(120));
    expect(intervalDaysForLevel(121)).toEqual(intervalDaysForLevel(160));
    expect(intervalDaysForLevel(40)).not.toEqual(intervalDaysForLevel(41));
  });

  it('ends every tier at the same half year step, which repeats for good', () => {
    REVIEW_INTERVAL_TIERS.forEach((tier) => {
      expect(tier.intervalDays.at(-1)).toBe(MAINTENANCE_INTERVAL_DAYS);
      expect(Math.max(...tier.intervalDays)).toBe(MAINTENANCE_INTERVAL_DAYS);
      expect(tier.intervalDays).toEqual([...tier.intervalDays].sort((a, b) => a - b));
    });
    expect(new Set(REVIEW_INTERVAL_TIERS.map((tier) => tier.intervalDays.length)).size).toBe(1);
    const manySure = Array<'sure'>(500).fill('sure');
    expect([30, 70, 110, 150].map((level) => reviewIntervalDays(manySure, level))).toEqual([
      182, 182, 182, 182,
    ]);
  });

  it('never makes a higher level wait longer for the same practice count', () => {
    const levels = [30, 70, 110, 150].map((level) => intervalDaysForLevel(level));
    levels.slice(1).forEach((intervals, index) => {
      intervals.forEach((days, step) => expect(days).toBeLessThanOrEqual(levels[index][step]));
    });
  });
});

describe('summarizePractice', () => {
  it('treats a learned dance without entries as due and most urgent', () => {
    const [first, second] = summarizePractice([entry(1, 1, '2026-01-01'), never(2)], today);
    expect(first).toMatchObject({
      choreography_id: 2,
      last_practiced_on: null,
      practice_count: 0,
      next_due_on: null,
      is_due: true,
      days_overdue: null,
    });
    expect(second.choreography_id).toBe(1);
  });

  it('computes last practice, count, next due date and overdue days', () => {
    const [summary] = summarizePractice(
      [entry(1, 1, '2026-11-01'), entry(1, 2, '2026-11-10')],
      today,
    );
    expect(summary).toMatchObject({
      last_practiced_on: '2026-11-10',
      practice_count: 2,
      next_due_on: '2026-11-12',
      is_due: true,
      days_overdue: 12,
    });
  });

  it('is not due before the interval has passed', () => {
    const [summary] = summarizePractice([entry(1, 1, '2026-11-24')], today);
    expect(summary).toMatchObject({ next_due_on: '2026-11-25', is_due: false, days_overdue: -1 });
  });

  it('uses the level of the dance for the next due date', () => {
    const rows = [
      entry(1, 1, '2026-11-20', 'sure', 30),
      entry(1, 2, '2026-11-21', 'sure', 30),
      entry(1, 3, '2026-11-22', 'sure', 30),
      entry(2, 4, '2026-11-20', 'sure', 150),
      entry(2, 5, '2026-11-21', 'sure', 150),
      entry(2, 6, '2026-11-22', 'sure', 150),
    ];
    const byId = Object.fromEntries(
      summarizePractice(rows, today).map((summary) => [summary.choreography_id, summary]),
    );
    expect(byId[1].next_due_on).toBe('2026-11-26');
    expect(byId[2].next_due_on).toBe('2026-11-24');
  });

  it('orders by the time since the last practice relative to the interval', () => {
    const rows = [
      entry(1, 1, '2026-11-20'), // 1 sure -> 1 day, 4 days elapsed: ratio 4
      entry(2, 2, '2026-11-10'),
      entry(2, 3, '2026-11-11'),
      entry(2, 4, '2026-11-12'), // 3 sure -> 7 days, 12 elapsed: ratio ~1.7
      entry(3, 5, '2026-11-23'),
    ];
    expect(summarizePractice(rows, today).map((summary) => summary.choreography_id)).toEqual([
      1, 2, 3,
    ]);
  });

  it('orders late entered practices by date, not by entry order', () => {
    const [summary] = summarizePractice(
      [entry(1, 5, '2026-11-20', 'unsure'), entry(1, 6, '2026-11-01', 'sure')],
      today,
    );
    expect(summary).toMatchObject({ last_practiced_on: '2026-11-20', next_due_on: '2026-11-21' });
  });

  it('keeps the note of the latest practice', () => {
    const rows = [
      { ...entry(1, 1, '2026-11-01'), note: 'old' },
      { ...entry(1, 2, '2026-11-02'), note: 'new' },
    ];
    expect(summarizePractice(rows, today)[0].last_note).toBe('new');
  });
});

function baseline(
  choreographyId: number,
  id: number,
  practicedOn: string,
  step: number,
  dueOn: string,
  levelValue = 30,
): PracticeRow {
  return {
    ...entry(choreographyId, id, practicedOn, 'sure', levelValue),
    step,
    due_on: dueOn,
  };
}

describe('interval step baseline', () => {
  it('is due on its date, is no practice and continues from the step', () => {
    const [summary] = summarizePractice([baseline(1, 1, '2026-11-20', 8, '2026-12-20')], today);
    expect(summary).toMatchObject({
      last_practiced_on: null,
      last_note: null,
      practice_count: 0,
      next_due_on: '2026-12-20',
      is_due: false,
      days_overdue: -26,
    });
  });

  it('counts the next sure practice as the step after the baseline', () => {
    const rows = [baseline(1, 1, '2026-11-01', 8, '2026-12-01'), entry(1, 2, '2026-11-24')];
    const [summary] = summarizePractice(rows, today);
    expect(summary).toMatchObject({ practice_count: 1, last_practiced_on: '2026-11-24' });
    // Step 9 of the beginner ladder is 45 days.
    expect(summary.next_due_on).toBe('2027-01-08');
  });

  it('starts again after an unsure practice following the baseline', () => {
    const rows = [
      baseline(1, 1, '2026-11-01', 8, '2026-12-01'),
      entry(1, 2, '2026-11-24', 'unsure'),
    ];
    expect(summarizePractice(rows, today)[0].next_due_on).toBe('2026-11-25');
  });

  it('lets a later baseline replace the history', () => {
    const rows = [
      entry(1, 1, '2026-01-01'),
      entry(1, 2, '2026-01-02'),
      baseline(1, 3, '2026-11-24', 3, '2026-11-28'),
    ];
    expect(summarizePractice(rows, today)[0]).toMatchObject({
      practice_count: 2,
      next_due_on: '2026-11-28',
    });
  });

  it('ranks a baseline relative to its own interval', () => {
    const rows = [
      baseline(1, 1, '2026-11-14', 8, '2026-12-14'), // 10 of 30 days
      baseline(2, 2, '2026-11-14', 5, '2026-11-24'), // due today: 10 of 10 days
    ];
    expect(summarizePractice(rows, today).map((summary) => summary.choreography_id)).toEqual([
      2, 1,
    ]);
  });
});

describe('planBaseline', () => {
  const dances = (count: number, levelValue = 30): { id: number; level_value: number }[] =>
    Array.from({ length: count }, (_, index) => ({ id: index + 1, level_value: levelValue }));

  it('makes every dance due after the full interval without spreading', () => {
    expect(planBaseline(dances(3), 8, false, today).map((plan) => plan.due_on)).toEqual([
      '2026-12-24',
      '2026-12-24',
      '2026-12-24',
    ]);
  });

  it('spreads the due dates evenly over the interval', () => {
    const due = planBaseline(dances(30), 8, true, today).map((plan) => plan.due_on);
    expect(due[0]).toBe('2026-11-25');
    expect(due.at(-1)).toBe('2026-12-24');
    expect(new Set(due).size).toBe(30);
  });

  it('keeps all dates within the interval and uses the level of each dance', () => {
    const plan = planBaseline(
      [
        { id: 2, level_value: 150 },
        { id: 1, level_value: 30 },
      ],
      8,
      false,
      today,
    );
    expect(plan).toEqual([
      { choreography_id: 1, due_on: '2026-12-24' },
      { choreography_id: 2, due_on: '2026-12-09' },
    ]);
    expect(planBaseline(dances(1), 1, true, today)[0].due_on).toBe('2026-11-25');
  });

  it('accepts only the steps of the ladder', () => {
    expect(validateBaseline({ choreography_ids: [1], step: 1 })).toEqual({
      value: { choreography_ids: [1], step: 1, spread: true },
    });
    expect(
      validateBaseline({ choreography_ids: [1, 1], step: REVIEW_STEP_COUNT, spread: false }),
    ).toEqual({
      value: { choreography_ids: [1], step: REVIEW_STEP_COUNT, spread: false },
    });
    expect(validateBaseline({ choreography_ids: [1], step: 0 })).toEqual({ error: 'invalid_step' });
    expect(validateBaseline({ choreography_ids: [1], step: REVIEW_STEP_COUNT + 1 })).toEqual({
      error: 'invalid_step',
    });
    expect(validateBaseline({ choreography_ids: [1], step: '3' })).toEqual({
      error: 'invalid_step',
    });
    expect(validateBaseline({ choreography_ids: [1], step: 3, spread: 'yes' })).toEqual({
      error: 'invalid_spread',
    });
    expect(validateBaseline({ choreography_ids: [], step: 3 })).toEqual({
      error: 'invalid_choreography_ids',
    });
  });
});

describe('dates', () => {
  it('formats local dates and detects the future', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isFutureDate('2026-11-25', today)).toBe(true);
    expect(isFutureDate(today, today)).toBe(false);
    expect(isFutureDate('2025-12-31', today)).toBe(false);
  });
});

describe('practice validation', () => {
  it('accepts a batch, removes duplicates and applies defaults', () => {
    expect(validateLogPractice({ choreography_ids: [1, 2, 2] })).toEqual({
      value: {
        choreography_ids: [1, 2],
        practiced_on: null,
        confidence: 'sure',
        song_id: null,
        note: null,
      },
    });
  });

  it('trims the note and turns a blank note into null', () => {
    expect(validateLogPractice({ choreography_ids: [1], note: '  restart  ' })).toMatchObject({
      value: { note: 'restart' },
    });
    expect(validateLogPractice({ choreography_ids: [1], note: '   ' })).toMatchObject({
      value: { note: null },
    });
  });

  it.each([
    [{}, 'invalid_choreography_ids'],
    [{ choreography_ids: [] }, 'invalid_choreography_ids'],
    [{ choreography_ids: ['1'] }, 'invalid_choreography_ids'],
    [{ choreography_ids: [0] }, 'invalid_choreography_ids'],
    [
      { choreography_ids: Array.from({ length: 101 }, (_, i) => i + 1) },
      'invalid_choreography_ids',
    ],
    [{ choreography_ids: [1], practiced_on: '2026-02-30' }, 'invalid_date'],
    [{ choreography_ids: [1], practiced_on: '24.11.2026' }, 'invalid_date'],
    [{ choreography_ids: [1], confidence: 'maybe' }, 'invalid_confidence'],
    [{ choreography_ids: [1, 2], song_id: 3 }, 'invalid_song'],
    [{ choreography_ids: [1], note: 'x'.repeat(501) }, 'invalid_note'],
  ])('rejects %j as %s', (input, error) => {
    expect(validateLogPractice(input)).toEqual({ error });
  });

  it('validates the list limit and entry ids', () => {
    expect(validateLogList({})).toEqual({ value: { limit: 100 } });
    expect(validateLogList({ limit: '20' })).toEqual({ value: { limit: 20 } });
    expect(validateLogList({ limit: '0' })).toEqual({ error: 'invalid_limit' });
    expect(validateLogList({ limit: '501' })).toEqual({ error: 'invalid_limit' });
    expect(validateLogList({ limit: 'abc' })).toEqual({ error: 'invalid_limit' });
    expect(validateEntryId('12')).toEqual({ value: 12 });
    expect(validateEntryId('0')).toEqual({ error: 'invalid_id' });
    expect(validateEntryId('1x')).toEqual({ error: 'invalid_id' });
  });
});
