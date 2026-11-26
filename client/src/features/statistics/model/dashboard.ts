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
