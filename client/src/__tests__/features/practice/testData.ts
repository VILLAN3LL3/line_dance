import type { Choreography, PracticeSummary } from "../../../types";

export function makeDance(
  id: number,
  name: string,
  overrides: Partial<Choreography> = {},
): Choreography {
  return {
    id,
    name,
    level: "Beginner",
    official_level: "Beginner",
    personal_level: null,
    authors: [],
    tags: [],
    step_figures: [],
    rating: null,
    learning_status: "learned",
    learning_status_date: "2026-11-01",
    choreography_songs: [],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeSummary(id: number, overrides: Partial<PracticeSummary> = {}): PracticeSummary {
  return {
    choreography_id: id,
    last_practiced_on: null,
    last_note: null,
    practice_count: 0,
    next_due_on: null,
    is_due: true,
    days_overdue: null,
    ...overrides,
  };
}
