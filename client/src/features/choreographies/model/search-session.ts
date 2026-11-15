import type { SearchFilters } from "../../../types";

export type DisplayMode = "card" | "table";

export const DISPLAY_MODE_STORAGE_KEY = "displayMode";
export const CURRENT_FILTERS_STORAGE_KEY = "currentFilters";

export const parseDisplayMode = (stored: string | null): DisplayMode =>
  stored === "card" || stored === "table" ? stored : "card";

/** Parses the `?filters=` query value; malformed JSON is ignored. */
export const parseFiltersParam = (param: string | null): SearchFilters | undefined => {
  if (!param) return undefined;
  try {
    return JSON.parse(param) as SearchFilters;
  } catch {
    return undefined;
  }
};

interface InitialFilterSources {
  routeFilters?: SearchFilters;
  urlFilters?: SearchFilters;
  storedFilters?: SearchFilters;
}

/** Same-tab navigation wins over new-tab URL param, which wins over the last used filters. */
export const resolveInitialFilters = ({
  routeFilters,
  urlFilters,
  storedFilters,
}: InitialFilterSources): SearchFilters => routeFilters ?? urlFilters ?? storedFilters ?? {};

export const areFiltersEqual = (left: SearchFilters, right: SearchFilters): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
