import type { AuthorStats, LevelOption } from "../../../types";

export type SortField = "name" | "total";
export type SortDir = "asc" | "desc";

export const levelNamesByValue = (levels: LevelOption[]): string[] =>
  levels
    .slice()
    .sort((a, b) => a.value - b.value)
    .map((level) => level.name);

export const toggleInSet = <T>(set: Set<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

/** Name sorts ascending first, counts descending first; the active column flips direction. */
export const nextSort = (
  current: { field: SortField; dir: SortDir },
  field: SortField,
): { field: SortField; dir: SortDir } => {
  if (field === current.field) {
    return { field, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { field, dir: field === "name" ? "asc" : "desc" };
};

export const getAriaSort = (
  sort: { field: SortField; dir: SortDir },
  field: SortField,
): "ascending" | "descending" | "none" => {
  if (sort.field !== field) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
};

/** Rows matching the name filter and at least one active level, ordered by the current sort. */
export const filterAndSortAuthors = (
  stats: AuthorStats[],
  nameFilter: string,
  activeLevels: Set<string>,
  sort: { field: SortField; dir: SortDir },
): AuthorStats[] => {
  let rows = stats;
  const query = nameFilter.trim().toLowerCase();
  if (query) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(query));
  }
  if (activeLevels.size > 0) {
    rows = rows.filter((row) => [...activeLevels].some((level) => (row.by_level[level] ?? 0) > 0));
  }
  const direction = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) =>
    sort.field === "name"
      ? direction * a.name.localeCompare(b.name)
      : direction * (a.total - b.total),
  );
};

/** Path of the search page prefilled with an author (and optionally a level). */
export const buildAuthorSearchPath = (author: string, level?: string): string => {
  const filters: Record<string, unknown> = { authors: [author] };
  if (level) filters.level = [level];
  return "/?filters=" + encodeURIComponent(JSON.stringify(filters));
};
