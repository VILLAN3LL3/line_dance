import { describe, expect, it } from "vitest";

import {
  getBerlinTodayIso,
  getCourseStatus,
  getCourseStatusLabel,
  getSessionBadgeLabel,
  getSessionBadgeStatus,
  normalizeDate,
} from "../utils/courseStatus";

import type { DanceCourse, Session } from "../types";

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<DanceCourse> = {}): DanceCourse {
  return {
    id: 1,
    dance_group_id: 1,
    dance_group_name: "Test Group",
    semester: "WS 2025",
    created_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(session_date: string, id = 1): Session {
  return {
    id,
    dance_course_id: 1,
    session_date,
    dance_group_name: "Test Group",
    semester: "WS 2025",
    created_at: "2024-01-01T00:00:00.000Z",
  };
}

// Fixed reference date used throughout these tests
const TODAY = "2026-03-29";
const YESTERDAY = "2026-03-28";
const TOMORROW = "2026-03-30";
const LAST_WEEK = "2026-03-22";
const NEXT_WEEK = "2026-04-05";

// ---------------------------------------------------------------------------
// normalizeDate
// ---------------------------------------------------------------------------

describe("normalizeDate", () => {
  it("extracts the date portion from a full ISO datetime string", () => {
    expect(normalizeDate("2025-01-15T12:00:00.000Z")).toBe("2025-01-15");
  });

  it("returns a date-only string unchanged", () => {
    expect(normalizeDate("2025-01-15")).toBe("2025-01-15");
  });

  it("handles a datetime with space separator", () => {
    expect(normalizeDate("2025-01-15 08:30:00")).toBe("2025-01-15");
  });
});

// ---------------------------------------------------------------------------
// getCourseStatusLabel
// ---------------------------------------------------------------------------

describe("getCourseStatusLabel", () => {
  it('returns "Planned" for planned', () => {
    expect(getCourseStatusLabel("planned")).toBe("Planned");
  });

  it('returns "Running" for running', () => {
    expect(getCourseStatusLabel("running")).toBe("Running");
  });

  it('returns "Passed" for passed', () => {
    expect(getCourseStatusLabel("passed")).toBe("Passed");
  });
});

// ---------------------------------------------------------------------------
// Session badge helpers
// ---------------------------------------------------------------------------

describe("getSessionBadgeStatus", () => {
  it('returns "planned" when session is in the future', () => {
    expect(getSessionBadgeStatus(TOMORROW, TODAY)).toBe("planned");
  });

  it('returns "passed" when session is in the past', () => {
    expect(getSessionBadgeStatus(YESTERDAY, TODAY)).toBe("passed");
  });

  it("returns null for sessions happening today", () => {
    expect(getSessionBadgeStatus(TODAY, TODAY)).toBeNull();
  });
});

describe("getSessionBadgeLabel", () => {
  it('returns "Planned" for planned', () => {
    expect(getSessionBadgeLabel("planned")).toBe("Planned");
  });

  it('returns "Passed" for passed', () => {
    expect(getSessionBadgeLabel("passed")).toBe("Passed");
  });
});

// ---------------------------------------------------------------------------
// getBerlinTodayIso
// ---------------------------------------------------------------------------

describe("getBerlinTodayIso", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    expect(getBerlinTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches what Intl.DateTimeFormat produces for Europe/Berlin", () => {
    const expected = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(getBerlinTodayIso()).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// getCourseStatus – with sessions
// ---------------------------------------------------------------------------

describe("getCourseStatus — with sessions", () => {
  const course = makeCourse();

  it('returns "passed" when all sessions are in the past', () => {
    const sessions = [makeSession(LAST_WEEK, 1), makeSession(YESTERDAY, 2)];
    expect(getCourseStatus(course, sessions, TODAY)).toBe("passed");
  });

  it('returns "planned" when all sessions are in the future', () => {
    const sessions = [makeSession(TOMORROW, 1), makeSession(NEXT_WEEK, 2)];
    expect(getCourseStatus(course, sessions, TODAY)).toBe("planned");
  });

  it('returns "running" when sessions span past and future', () => {
    const sessions = [makeSession(YESTERDAY, 1), makeSession(TOMORROW, 2)];
    expect(getCourseStatus(course, sessions, TODAY)).toBe("running");
  });

  it('returns "running" when a session is exactly today', () => {
    expect(getCourseStatus(course, [makeSession(TODAY)], TODAY)).toBe("running");
  });

  it('returns "running" when sessions include today plus past and future dates', () => {
    const sessions = [makeSession(YESTERDAY, 1), makeSession(TODAY, 2), makeSession(TOMORROW, 3)];
    expect(getCourseStatus(course, sessions, TODAY)).toBe("running");
  });

  it('returns "running" for a single session that is today', () => {
    expect(getCourseStatus(course, [makeSession(TODAY)], TODAY)).toBe("running");
  });

  it('returns "passed" for a single past session', () => {
    expect(getCourseStatus(course, [makeSession(LAST_WEEK)], TODAY)).toBe("passed");
  });

  it('returns "planned" for a single future session', () => {
    expect(getCourseStatus(course, [makeSession(NEXT_WEEK)], TODAY)).toBe("planned");
  });

  it("handles session_date values that include time components", () => {
    const sessions = [makeSession(`${YESTERDAY}T23:59:59.000Z`)];
    expect(getCourseStatus(course, sessions, TODAY)).toBe("passed");
  });

  it("handles large numbers of sessions correctly", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(`2020-0${(i % 9) + 1}-01`, i),
    );
    expect(getCourseStatus(course, sessions, TODAY)).toBe("passed");
  });
});

// ---------------------------------------------------------------------------
// getCourseStatus – without sessions (start_date fallback)
// ---------------------------------------------------------------------------

describe("getCourseStatus — without sessions (start_date fallback)", () => {
  it('returns "planned" when there are no sessions and no start_date', () => {
    const course = makeCourse();
    expect(getCourseStatus(course, [], TODAY)).toBe("planned");
  });

  it('returns "planned" when start_date is in the future', () => {
    const course = makeCourse({ start_date: TOMORROW });
    expect(getCourseStatus(course, [], TODAY)).toBe("planned");
  });

  it('returns "running" when start_date equals today', () => {
    const course = makeCourse({ start_date: TODAY });
    expect(getCourseStatus(course, [], TODAY)).toBe("running");
  });

  it('returns "running" when start_date is in the past', () => {
    const course = makeCourse({ start_date: YESTERDAY });
    expect(getCourseStatus(course, [], TODAY)).toBe("running");
  });

  it('returns "planned" when start_date is undefined', () => {
    const course = makeCourse({ start_date: undefined });
    expect(getCourseStatus(course, [], TODAY)).toBe("planned");
  });

  it("normalizes start_date that includes a time component", () => {
    const course = makeCourse({ start_date: `${YESTERDAY}T00:00:00.000Z` });
    expect(getCourseStatus(course, [], TODAY)).toBe("running");
  });
});
