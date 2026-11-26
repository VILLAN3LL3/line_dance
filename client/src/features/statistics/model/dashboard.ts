import type { StatisticsItem, StatisticsMonth } from "../../../types";

export interface Bar {
  key: string;
  label: string;
  count: number;
  /** Width of the bar relative to the largest one, 0 to 100. */
  widthPercent: number;
  /** Share of all learned dances, as text. */
  shareText: string;
}

export const formatShare = (count: number, total: number): string =>
  total > 0 ? `${Math.round((count / total) * 100)} %` : "0 %";

/** The bars of one statistic; the largest count fills the full width. */
export function toBars(items: readonly StatisticsItem[], total: number): Bar[] {
  const largest = Math.max(0, ...items.map((item) => item.count));
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    count: item.count,
    widthPercent: largest > 0 ? (item.count / largest) * 100 : 0,
    shareText: formatShare(item.count, total),
  }));
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-11" becomes "Nov 2026". */
export function formatMonth(month: string): string {
  const [year, number] = month.split("-");
  const name = MONTH_NAMES[Number(number) - 1];
  return name ? `${name} ${year}` : month;
}

export interface MonthColumn {
  month: string;
  label: string;
  learned: number;
  practices: number;
  totalLearned: number;
  learnedPercent: number;
  practicesPercent: number;
  totalPercent: number;
  description: string;
}

const percentOf = (value: number, largest: number): number =>
  largest > 0 ? (value / largest) * 100 : 0;

/** Each series is scaled by its own maximum, so a few practices do not vanish next to many dances. */
export function toMonthColumns(months: readonly StatisticsMonth[]): MonthColumn[] {
  const largestLearned = Math.max(0, ...months.map((month) => month.learned));
  const largestPractices = Math.max(0, ...months.map((month) => month.practices));
  const largestTotal = Math.max(0, ...months.map((month) => month.total_learned));
  return months.map((month) => ({
    month: month.month,
    label: formatMonth(month.month),
    learned: month.learned,
    practices: month.practices,
    totalLearned: month.total_learned,
    learnedPercent: percentOf(month.learned, largestLearned),
    practicesPercent: percentOf(month.practices, largestPractices),
    totalPercent: percentOf(month.total_learned, largestTotal),
    description: `${formatMonth(month.month)}: ${month.learned} learned, ${month.practices} practices, ${month.total_learned} learned in total`,
  }));
}

const UNKNOWN_KEY = "unknown";
const OTHER_KEY = "other";
/** Distinguishable colors in the style of the app; unknown and other get fixed grey tones. */
export const DONUT_COLORS = ["#7b3f8a", "#d27447", "#1f8a5b", "#3b6fb6", "#c88410", "#b5446e"];
export const UNKNOWN_COLOR = "#c5c9d3";
export const OTHER_COLOR = "#8e93a0";

export interface DonutSlice {
  key: string;
  label: string;
  count: number;
  shareText: string;
  color: string;
  startPercent: number;
  endPercent: number;
}

/**
 * Keeps the `maxNamed` most frequent items and sums the rest up as "Other". Unknown stays an item of
 * its own, last, and does not count towards the limit.
 */
export function groupMinorItems(
  items: readonly StatisticsItem[],
  maxNamed: number,
): { items: StatisticsItem[]; groupedCount: number } {
  const named = items.filter((item) => item.key !== UNKNOWN_KEY && item.count > 0);
  const unknown = items.filter((item) => item.key === UNKNOWN_KEY && item.count > 0);
  const rest = named.slice(maxNamed);
  const result: StatisticsItem[] = named.slice(0, maxNamed);
  if (rest.length > 0) {
    result.push({
      key: OTHER_KEY,
      label: "Other",
      count: rest.reduce((sum, item) => sum + item.count, 0),
    });
  }
  return { items: [...result, ...unknown], groupedCount: rest.length };
}

/** The slices of a donut in order; items without dances are left out. */
export function toDonutSlices(items: readonly StatisticsItem[]): DonutSlice[] {
  const shown = items.filter((item) => item.count > 0);
  const total = shown.reduce((sum, item) => sum + item.count, 0);
  let colorIndex = 0;
  let passed = 0;
  return shown.map((item) => {
    let color = UNKNOWN_COLOR;
    if (item.key === OTHER_KEY) color = OTHER_COLOR;
    else if (item.key !== UNKNOWN_KEY) color = DONUT_COLORS[colorIndex++ % DONUT_COLORS.length];
    const startPercent = (passed / total) * 100;
    passed += item.count;
    return {
      key: item.key,
      label: item.label,
      count: item.count,
      shareText: formatShare(item.count, total),
      color,
      startPercent,
      endPercent: (passed / total) * 100,
    };
  });
}

/** The CSS background of a donut: one colored segment per slice. */
export function donutBackground(slices: readonly DonutSlice[]): string {
  if (slices.length === 0) return UNKNOWN_COLOR;
  const segments = slices.map(
    (slice) => `${slice.color} ${slice.startPercent}% ${slice.endPercent}%`,
  );
  return `conic-gradient(${segments.join(", ")})`;
}
