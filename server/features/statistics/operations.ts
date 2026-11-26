import type { RepertoireStatistics, StatisticsItem, StatisticsMonth } from '../../contracts/api.ts';

export const UNKNOWN_KEY = 'unknown';
const UNKNOWN_LABEL = 'Unknown';
export const TOP_CHOREOGRAPHERS = 10;

/** One learned dance with the data of its effective level and of its default song. */
export type RepertoireRow = {
  choreography_id: number;
  creation_year: number | null;
  level_name: string | null;
  level_value: number | null;
  learned_on: string | null;
  bpm: number | null;
  genre: string | null;
};
export type AuthorRow = { choreography_id: number; author_name: string };
export type PracticeMonthRow = { month: string; practices: number };

/** Upper bounds (exclusive) of the tempo classes in BPM. */
const TEMPO_CLASSES: { key: string; label: string; below: number }[] = [
  { key: 'bpm-0', label: 'Below 100 BPM', below: 100 },
  { key: 'bpm-100', label: '100–119 BPM', below: 120 },
  { key: 'bpm-120', label: '120–139 BPM', below: 140 },
  { key: 'bpm-140', label: '140–159 BPM', below: 160 },
  { key: 'bpm-160', label: '160 BPM and above', below: Infinity },
];

export function tempoClass(bpm: number | null): { key: string; label: string } {
  if (bpm === null || !Number.isFinite(bpm) || bpm <= 0) {
    return { key: UNKNOWN_KEY, label: UNKNOWN_LABEL };
  }
  const found = TEMPO_CLASSES.find((candidate) => bpm < candidate.below);
  return found ?? TEMPO_CLASSES[TEMPO_CLASSES.length - 1];
}

function increment(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/** The most frequent first, ties by label; the unknown bar always comes last. */
function byCountThenLabel(a: StatisticsItem, b: StatisticsItem): number {
  if (a.key === UNKNOWN_KEY || b.key === UNKNOWN_KEY) {
    return Number(a.key === UNKNOWN_KEY) - Number(b.key === UNKNOWN_KEY);
  }
  return b.count - a.count || a.label.localeCompare(b.label);
}

/** The main levels in ascending order; the prefixes absolute, easy, low and high are left out. */
const MAIN_LEVELS: { key: string; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'improver', label: 'Improver' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

/** e.g. "EASY IMPROVER" and "HIGH IMPROVER" both belong to "improver"; others are unknown. */
export function mainLevelKey(levelName: string | null): string {
  const name = levelName?.toLowerCase() ?? '';
  return MAIN_LEVELS.find((level) => name.includes(level.key))?.key ?? UNKNOWN_KEY;
}

function levelItems(rows: readonly RepertoireRow[]): StatisticsItem[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => increment(counts, mainLevelKey(row.level_name)));
  return [...MAIN_LEVELS, unknownItem()]
    .map(({ key, label }) => ({ key, label, count: counts.get(key) ?? 0 }))
    .filter((item) => item.count > 0);
}

function tempoItems(rows: readonly RepertoireRow[]): StatisticsItem[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => increment(counts, tempoClass(row.bpm).key));
  const classes = [...TEMPO_CLASSES.map(({ key, label }) => ({ key, label })), unknownItem()];
  return classes
    .map(({ key, label }) => ({ key, label, count: counts.get(key) ?? 0 }))
    .filter((item) => item.count > 0 || item.key !== UNKNOWN_KEY);
}

const unknownItem = (): { key: string; label: string } => ({
  key: UNKNOWN_KEY,
  label: UNKNOWN_LABEL,
});

function genreItems(rows: readonly RepertoireRow[]): StatisticsItem[] {
  const counts = new Map<string, { label: string; count: number }>();
  rows.forEach((row) => {
    const label = row.genre?.trim() || UNKNOWN_LABEL;
    const key = row.genre?.trim() ? label.toLowerCase() : UNKNOWN_KEY;
    const entry = counts.get(key) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  });
  return [...counts].map(([key, entry]) => ({ key, ...entry })).sort(byCountThenLabel);
}

function yearItems(rows: readonly RepertoireRow[]): StatisticsItem[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    increment(counts, row.creation_year === null ? UNKNOWN_KEY : String(row.creation_year));
  });
  return [...counts]
    .map(([key, count]) => ({ key, label: key === UNKNOWN_KEY ? UNKNOWN_LABEL : key, count }))
    .sort((a, b) => {
      if (a.key === UNKNOWN_KEY || b.key === UNKNOWN_KEY) return byCountThenLabel(a, b);
      return Number(a.key) - Number(b.key);
    });
}

function choreographerItems(
  rows: readonly RepertoireRow[],
  authors: readonly AuthorRow[],
): { items: StatisticsItem[]; others: number } {
  const learned = new Set(rows.map((row) => row.choreography_id));
  // Names are compared ignoring case; the first spelling is shown.
  const namesByDance = new Map<number, Map<string, string>>();
  authors.forEach(({ choreography_id: id, author_name: name }) => {
    const trimmed = name.trim();
    if (!learned.has(id) || !trimmed) return;
    const names = namesByDance.get(id) ?? new Map<string, string>();
    if (!names.has(trimmed.toLowerCase())) names.set(trimmed.toLowerCase(), trimmed);
    namesByDance.set(id, names);
  });
  const counts = new Map<string, { label: string; count: number }>();
  let withoutAuthor = 0;
  rows.forEach((row) => {
    const names = namesByDance.get(row.choreography_id);
    if (!names || names.size === 0) withoutAuthor += 1;
    else {
      names.forEach((label, key) => {
        const entry = counts.get(key) ?? { label, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      });
    }
  });
  const ranked = [...counts].map(([key, entry]) => ({ key, ...entry })).sort(byCountThenLabel);
  const items = ranked.slice(0, TOP_CHOREOGRAPHERS);
  if (withoutAuthor > 0)
    items.push({ key: UNKNOWN_KEY, label: UNKNOWN_LABEL, count: withoutAuthor });
  return { items, others: Math.max(0, ranked.length - TOP_CHOREOGRAPHERS) };
}

function nextMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return number === 12
    ? `${year + 1}-01`
    : `${String(year)}-${String(number + 1).padStart(2, '0')}`;
}

/**
 * One entry per month from the first to the last month that has a learned dance or a practice,
 * without gaps. Dances without a date count as learned before the first month.
 */
function timeline(
  rows: readonly RepertoireRow[],
  practiceMonths: readonly PracticeMonthRow[],
): RepertoireStatistics['timeline'] {
  const learnedByMonth = new Map<string, number>();
  let undated = 0;
  rows.forEach((row) => {
    if (row.learned_on === null) undated += 1;
    else increment(learnedByMonth, row.learned_on.slice(0, 7));
  });
  const practiceByMonth = new Map(practiceMonths.map((row) => [row.month, row.practices]));
  const monthsWithData = [...learnedByMonth.keys(), ...practiceByMonth.keys()].sort();
  if (monthsWithData.length === 0) return { months: [], undated };

  const months: StatisticsMonth[] = [];
  let total = undated;
  const last = monthsWithData[monthsWithData.length - 1];
  for (let month = monthsWithData[0]; month <= last; month = nextMonth(month)) {
    const learned = learnedByMonth.get(month) ?? 0;
    total += learned;
    months.push({
      month,
      learned,
      total_learned: total,
      practices: practiceByMonth.get(month) ?? 0,
    });
  }
  return { months, undated };
}

export function buildRepertoireStatistics(
  rows: readonly RepertoireRow[],
  authors: readonly AuthorRow[],
  practiceMonths: readonly PracticeMonthRow[],
): RepertoireStatistics {
  const choreographers = choreographerItems(rows, authors);
  return {
    total: rows.length,
    levels: levelItems(rows),
    tempo: tempoItems(rows),
    genres: genreItems(rows),
    choreographers: choreographers.items,
    other_choreographers: choreographers.others,
    years: yearItems(rows),
    timeline: timeline(rows, practiceMonths),
  };
}
