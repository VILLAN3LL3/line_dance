import type { LearningStatus, SearchFilters } from "../../types";

export const choreographyKeys = {
  all: ["choreographies"] as const,
  search: (filters: SearchFilters) => ["choreographies", "search", filters] as const,
  byLearningStatus: (status: LearningStatus) =>
    ["choreographies", "learning-status", status] as const,
  list: ["choreographies", "list"] as const,
  detail: (id: number) => ["choreographies", "detail", id] as const,
  maxCount: ["choreographies", "max-count"] as const,
};
