export const practiceConfidences = ['sure', 'unsure'] as const;
export type PracticeConfidence = (typeof practiceConfidences)[number];

/**
 * Days until a dance is due again, by the number of consecutive "sure" practices. The higher the
 * level, the more often a dance has to be repeated, so the intervals grow more slowly at first.
 * All tiers end at the same step, which repeats for good: a learned dance is never dropped from the
 * box and comes back at least every half year. A tier applies up to and including its
 * `maxLevelValue`; the last tier has no upper bound.
 */
export const MAINTENANCE_INTERVAL_DAYS = 182;

export const REVIEW_INTERVAL_TIERS: readonly {
  name: string;
  maxLevelValue: number;
  intervalDays: readonly number[];
}[] = [
  {
    name: 'Beginner',
    maxLevelValue: 40,
    intervalDays: [1, 2, 4, 7, 10, 14, 21, 30, 45, 60, 90, 120, 150, MAINTENANCE_INTERVAL_DAYS],
  },
  {
    name: 'Improver',
    maxLevelValue: 80,
    intervalDays: [1, 2, 3, 5, 8, 12, 18, 26, 38, 55, 80, 115, 150, MAINTENANCE_INTERVAL_DAYS],
  },
  {
    name: 'Intermediate',
    maxLevelValue: 120,
    intervalDays: [1, 2, 3, 4, 6, 9, 13, 19, 28, 42, 62, 95, 140, MAINTENANCE_INTERVAL_DAYS],
  },
  {
    name: 'Advanced',
    maxLevelValue: Infinity,
    intervalDays: [1, 1, 2, 3, 5, 7, 10, 15, 22, 33, 50, 80, 125, MAINTENANCE_INTERVAL_DAYS],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** One row of a learned dance joined with its practice entries; the entry columns are null if never practiced. */
export type PracticeRow = {
  choreography_id: number;
  entry_id: number | null;
  practiced_on: string | null;
  confidence: PracticeConfidence | null;
  note: string | null;
  /** Set for an entry that sets the interval step instead of recording a practice. */
  step: number | null;
  due_on: string | null;
  /** Value of the effective level (personal level when set). */
  level_value: number;
};

export type PracticeSummary = {
  choreography_id: number;
  last_practiced_on: string | null;
  last_note: string | null;
  practice_count: number;
  next_due_on: string | null;
  is_due: boolean;
  /** Days past the due date (negative while not due yet); null if the dance was never practiced. */
  days_overdue: number | null;
};

type PracticeEntry = {
  id: number;
  practiced_on: string;
  confidence: PracticeConfidence;
  note: string | null;
  step: number | null;
  due_on: string | null;
};

export function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromDayNumber(toDayNumber(isoDate) + days);
}

export function isFutureDate(isoDate: string, today: string): boolean {
  return toDayNumber(isoDate) > toDayNumber(today);
}

export function intervalDaysForLevel(levelValue: number): readonly number[] {
  const tier =
    REVIEW_INTERVAL_TIERS.find((candidate) => levelValue <= candidate.maxLevelValue) ??
    REVIEW_INTERVAL_TIERS[0];
  return tier.intervalDays;
}

/** Number of steps of the interval ladder; the last one repeats. */
export const REVIEW_STEP_COUNT = REVIEW_INTERVAL_TIERS[0].intervalDays.length;

/** Days until the next review after `streak` consecutive "sure" practices (0 starts again). */
export function intervalAtStreak(streak: number, levelValue: number): number {
  const intervals = intervalDaysForLevel(levelValue);
  return intervals[Math.min(Math.max(streak - 1, 0), intervals.length - 1)];
}

/** An entry that sets the step restarts the count there; "unsure" starts again. */
function streakOf(entries: readonly Pick<PracticeEntry, 'confidence' | 'step'>[]): number {
  return entries.reduce((streak, entry) => {
    if (entry.step !== null) return entry.step;
    return entry.confidence === 'sure' ? streak + 1 : 0;
  }, 0);
}

/** "Unsure" starts the sequence again, every "sure" practice moves one step up the intervals. */
export function reviewIntervalDays(
  confidences: readonly PracticeConfidence[],
  levelValue: number,
): number {
  const entries = confidences.map((confidence) => ({ confidence, step: null }));
  return intervalAtStreak(streakOf(entries), levelValue);
}

function compareEntries(a: PracticeEntry, b: PracticeEntry): number {
  return a.practiced_on.localeCompare(b.practiced_on) || a.id - b.id;
}

type RankedSummary = { summary: PracticeSummary; urgency: number };

function summarizeDance(
  choreographyId: number,
  entries: PracticeEntry[],
  levelValue: number,
  today: string,
): RankedSummary {
  const ordered = [...entries].sort(compareEntries);
  const last = ordered.at(-1);
  if (!last) {
    return {
      urgency: Infinity,
      summary: {
        choreography_id: choreographyId,
        last_practiced_on: null,
        last_note: null,
        practice_count: 0,
        next_due_on: null,
        is_due: true,
        days_overdue: null,
      },
    };
  }
  // Entries that only set the step are no practice: they neither count nor become "last practiced".
  const practices = ordered.filter((entry) => entry.step === null);
  const lastPractice = practices.at(-1);
  const referenceDay = toDayNumber(last.practiced_on);
  const dueDay =
    last.due_on === null
      ? referenceDay + intervalAtStreak(streakOf(ordered), levelValue)
      : toDayNumber(last.due_on);
  const overdue = toDayNumber(today) - dueDay;
  return {
    urgency: (toDayNumber(today) - referenceDay) / Math.max(dueDay - referenceDay, 1),
    summary: {
      choreography_id: choreographyId,
      last_practiced_on: lastPractice?.practiced_on ?? null,
      last_note: lastPractice?.note ?? null,
      practice_count: practices.length,
      next_due_on: fromDayNumber(dueDay),
      is_due: overdue >= 0,
      days_overdue: overdue,
    },
  };
}

/** Groups the rows per dance and sorts them with the most urgent dance first. */
export function summarizePractice(rows: readonly PracticeRow[], today: string): PracticeSummary[] {
  const entriesByDance = new Map<number, { levelValue: number; entries: PracticeEntry[] }>();
  rows.forEach((row) => {
    const dance = entriesByDance.get(row.choreography_id) ?? {
      levelValue: row.level_value,
      entries: [],
    };
    if (row.entry_id !== null && row.practiced_on !== null && row.confidence !== null) {
      dance.entries.push({
        id: row.entry_id,
        practiced_on: row.practiced_on,
        confidence: row.confidence,
        note: row.note,
        step: row.step,
        due_on: row.due_on,
      });
    }
    entriesByDance.set(row.choreography_id, dance);
  });
  return [...entriesByDance]
    .map(([id, { levelValue, entries }]) => summarizeDance(id, entries, levelValue, today))
    .sort((a, b) => {
      if (a.urgency !== b.urgency) return b.urgency > a.urgency ? 1 : -1;
      return a.summary.choreography_id - b.summary.choreography_id;
    })
    .map(({ summary }) => summary);
}

export type BaselinePlan = { choreography_id: number; due_on: string };

/**
 * Due dates for dances that are put on an interval step once. Without `spread` every dance is due
 * after the full interval of the step; with it the due dates are spread evenly over that interval,
 * so a whole library does not come back on the same day.
 */
export function planBaseline(
  dances: readonly { id: number; level_value: number }[],
  step: number,
  spread: boolean,
  today: string,
): BaselinePlan[] {
  const ordered = [...dances].sort((a, b) => a.id - b.id);
  return ordered.map((dance, index) => {
    const interval = intervalAtStreak(step, dance.level_value);
    const delay = spread ? 1 + Math.floor((index * interval) / ordered.length) : interval;
    return { choreography_id: dance.id, due_on: addDays(today, delay) };
  });
}

/** The interval ladder of every level tier, so clients can describe the steps without a copy. */
export function describeIntervalTiers(): {
  name: string;
  max_level_value: number | null;
  interval_days: readonly number[];
}[] {
  return REVIEW_INTERVAL_TIERS.map((tier) => ({
    name: tier.name,
    max_level_value: Number.isFinite(tier.maxLevelValue) ? tier.maxLevelValue : null,
    interval_days: tier.intervalDays,
  }));
}

/** LIKE pattern for "name contains query"; wildcards typed by the user are matched literally. */
export function toContainsPattern(query: string): string {
  return '%' + query.replace(/[\\%_]/g, (character) => '\\' + character) + '%';
}
