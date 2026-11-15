import type { SearchFilters } from "../../types";

export const choreographyKeys = {
  all: ["choreographies"] as const,
  search: (filters: SearchFilters) => ["choreographies", "search", filters] as const,
  maxCount: ["choreographies", "max-count"] as const,
};
