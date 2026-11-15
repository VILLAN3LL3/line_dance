import { describe, expect, it } from "vitest";

import {
  buildCoursesWithStatus,
  selectVisibleCourses,
} from "../../../features/dance-groups/model/course-overview";
import {
  buildLearnedSearchFilters,
  buildSearchPageUrl,
  buildSuggestionSearchFilters,
  getLearnedStepFigures,
  groupSessionsByCourseId,
} from "../../../features/dance-groups/model/learned-step-figures";

import type { Choreography, DanceCourse, LearnedChoreography, Session } from "../../../types";

const TODAY = "2025-06-15";
const course = (id: number, overrides: Partial<DanceCourse> = {}): DanceCourse =>
  ({ id, course_id: id, ...overrides }) as DanceCourse;
const session = (courseId: number, date: string): Session =>
  ({ id: Math.random(), dance_course_id: courseId, session_date: date }) as Session;

describe("course-overview model", () => {
  const courses = [course(1), course(2), course(3), course(4, { start_date: "2025-09-01" })];
  const sessions = {
    1: [session(1, "2025-06-01"), session(1, "2025-06-20")],
    2: [session(2, "2025-05-01")],
    3: [session(3, "2025-07-01")],
  };
  const withStatus = buildCoursesWithStatus(courses, sessions, TODAY);

  it("derives status and next planned date", () => {
    expect(withStatus.map((c) => c.status)).toEqual(["running", "passed", "planned", "planned"]);
    expect(withStatus[2].nextPlannedDate).toBe("2025-07-01");
    expect(withStatus[3].nextPlannedDate).toBe("2025-09-01");
    expect(withStatus[0].nextPlannedDate).toBeNull();
  });

  it("shows running courses by default and adds planned/passed on request", () => {
    expect(selectVisibleCourses(withStatus, false, false).map((c) => c.id)).toEqual([1]);
    expect(selectVisibleCourses(withStatus, true, false).map((c) => c.id)).toEqual([1, 3, 4]);
    expect(selectVisibleCourses(withStatus, false, true).map((c) => c.id)).toEqual([1, 2]);
  });

  it("falls back to the next planned course when nothing is running", () => {
    const noRunning = buildCoursesWithStatus(
      [course(3), course(4, { start_date: "2025-09-01" })],
      {
        3: sessions[3],
      },
      TODAY,
    );
    expect(selectVisibleCourses(noRunning, false, false).map((c) => c.id)).toEqual([3]);
  });
});

describe("learned-step-figures model", () => {
  it("combines base figures with figures of choreographies learned before today", () => {
    const learned = [
      { choreography_id: 1, first_learned_date: "2025-01-01" },
      { choreography_id: 2, first_learned_date: "2025-06-15" },
    ] as LearnedChoreography[];
    const choreographies = [
      { id: 1, step_figures: ["Weave", "Rock"] },
      { id: 2, step_figures: ["Mambo"] },
    ] as Choreography[];
    expect(getLearnedStepFigures(learned, choreographies, ["Rock", "Basic"], TODAY)).toEqual([
      "Basic",
      "Rock",
      "Weave",
    ]);
  });

  it("builds search filters with an optional level cap", () => {
    expect(buildLearnedSearchFilters(["A"], null)).toEqual({
      step_figures: ["A"],
      step_figures_match_mode: "exact",
    });
    expect(buildSuggestionSearchFilters(["A"], "B", 30)).toEqual({
      step_figures: ["A", "B"],
      step_figures_match_mode: "exact",
      required_step_figures: ["B"],
      max_level_value: 30,
    });
    expect(buildSearchPageUrl({ search: "a b" })).toBe(
      "/?filters=" + encodeURIComponent('{"search":"a b"}'),
    );
  });

  it("groups sessions by course", () => {
    const grouped = groupSessionsByCourseId([session(1, "a"), session(2, "b"), session(1, "c")]);
    expect(grouped[1]).toHaveLength(2);
    expect(grouped[2]).toHaveLength(1);
  });
});
