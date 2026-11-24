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

export function isFutureDate(isoDate: string, today: string): boolean {
  return toDayNumber(isoDate) > toDayNumber(today);
}

export function intervalDaysForLevel(levelValue: number): readonly number[] {
  const tier =
    REVIEW_INTERVAL_TIERS.find((candidate) => levelValue <= candidate.maxLevelValue) ??
    REVIEW_INTERVAL_TIERS[0];
  return tier.intervalDays;
}

/** "Unsure" starts the sequence again, every "sure" practice moves one step up the intervals. */
export function reviewIntervalDays(
  confidences: readonly PracticeConfidence[],
  levelValue: number,
): number {
  const intervals = intervalDaysForLevel(levelValue);
  const streak = confidences.reduce((count, value) => (value === 'sure' ? count + 1 : 0), 0);
  return intervals[Math.min(Math.max(streak - 1, 0), intervals.length - 1)];
}

function compareEntries(a: PracticeEntry, b: PracticeEntry): number {
  return a.practiced_on.localeCompare(b.practiced_on) || a.id - b.id;
}

function summarizeDance(
  choreographyId: number,
  entries: PracticeEntry[],
  levelValue: number,
  today: string,
): PracticeSummary {
  const ordered = [...entries].sort(compareEntries);
  const last = ordered.at(-1);
  if (!last) {
    return {
      choreography_id: choreographyId,
      last_practiced_on: null,
      last_note: null,
      practice_count: 0,
      next_due_on: null,
      is_due: true,
      days_overdue: null,
    };
  }
  const interval = reviewIntervalDays(
    ordered.map((entry) => entry.confidence),
    levelValue,
  );
  const dueDay = toDayNumber(last.practiced_on) + interval;
  const overdue = toDayNumber(today) - dueDay;
  return {
    choreography_id: choreographyId,
    last_practiced_on: last.practiced_on,
    last_note: last.note,
    practice_count: ordered.length,
    next_due_on: fromDayNumber(dueDay),
    is_due: overdue >= 0,
    days_overdue: overdue,
  };
}

/** Ratio of the time since the last practice to the interval; never practiced dances come first. */
function urgency(summary: PracticeSummary, today: string): number {
  if (summary.last_practiced_on === null || summary.next_due_on === null) return Infinity;
  const elapsed = toDayNumber(today) - toDayNumber(summary.last_practiced_on);
  const interval = toDayNumber(summary.next_due_on) - toDayNumber(summary.last_practiced_on);
  return elapsed / interval;
}

/** Groups the rows per dance and sorts them with the most urgent dance first. */
export function summarizePractice(rows: readonly PracticeRow[], today: string): PracticeSummary[] {
  const entriesByDance = new Map<number, { levelValue: number; entries: PracticeEntry[] }>();
  rows.forEach((row) => {
    const dance = entriesByDance.get(row.choreography_id) ?? {
      levelValue: row.level_value,
      entries: [],
    };
    const { entries } = dance;
    if (row.entry_id !== null && row.practiced_on !== null && row.confidence !== null) {
      entries.push({
        id: row.entry_id,
        practiced_on: row.practiced_on,
        confidence: row.confidence,
        note: row.note,
      });
    }
    entriesByDance.set(row.choreography_id, dance);
  });
  return [...entriesByDance]
    .map(([id, { levelValue, entries }]) => summarizeDance(id, entries, levelValue, today))
    .map((summary) => ({ summary, urgency: urgency(summary, today) }))
    .sort((a, b) => {
      if (a.urgency !== b.urgency) return b.urgency > a.urgency ? 1 : -1;
      return a.summary.choreography_id - b.summary.choreography_id;
    })
    .map(({ summary }) => summary);
}
