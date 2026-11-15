import { describe, expect, it } from "vitest";

import {
  filterVisibleSessions,
  findChoreographyByQuery,
  formatCourseHeader,
  getChoreographyOptionLabel,
  getSelectableChoreographies,
  hasKey,
  omitKey,
  parseCourseDetailRoute,
} from "../../../features/courses/model/course-detail";
import {
  emptyCourseForm,
  hasCourseIdentifier,
  mapCourseFieldIssues,
  parseCourseFormRoute,
  toCreateCoursePayload,
  toCourseFormValues,
  toUpdateCoursePayload,
} from "../../../features/courses/model/course-form";

import type { Choreography, DanceCourse, Session, SessionChoreography } from "../../../types";

const choreo = (id: number, name: string): Choreography =>
  ({ id, name, level: "Beginner" }) as Choreography;

describe("course-detail model", () => {
  it("flags invalid route params", () => {
    expect(parseCourseDetailRoute("2", "7")).toMatchObject({
      groupId: 2,
      courseId: 7,
      error: null,
    });
    expect(parseCourseDetailRoute("x", "7").error).toBe("Invalid route parameters");
    expect(parseCourseDetailRoute("2", undefined).error).toBe("Invalid route parameters");
  });

  it("formats the header from course id or name and semester", () => {
    expect(formatCourseHeader(null)).toBe("");
    expect(formatCourseHeader({ course_id: 7, semester: "WS 25" } as DanceCourse)).toBe(
      "7 (WS 25)",
    );
    expect(formatCourseHeader({ course_id: null, name: "Basics" } as DanceCourse)).toBe("Basics");
  });

  it("hides passed sessions unless requested", () => {
    const sessions = [
      { id: 1, session_date: "2024-01-01T00:00:00Z" },
      { id: 2, session_date: "2024-06-01" },
    ] as Session[];
    expect(filterVisibleSessions(sessions, false, "2024-03-01").map((s) => s.id)).toEqual([2]);
    expect(filterVisibleSessions(sessions, true, "2024-03-01")).toHaveLength(2);
  });

  it("offers only choreographies that are not already in the session", () => {
    const selectable = getSelectableChoreographies([choreo(1, "A"), choreo(2, "B")], [
      { choreography_id: 1 },
    ] as SessionChoreography[]);
    expect(selectable.map((c) => c.id)).toEqual([2]);
  });

  it("matches the picker query by label or plain name", () => {
    const options = [choreo(2, "B")];
    expect(findChoreographyByQuery(options, "B")?.id).toBe(2);
    expect(findChoreographyByQuery(options, getChoreographyOptionLabel(options[0]))?.id).toBe(2);
    expect(findChoreographyByQuery(options, "C")).toBeUndefined();
  });

  it("removes keys immutably", () => {
    const record = { 1: "a", 2: "b" };
    expect(omitKey(record, 1)).toEqual({ 2: "b" });
    expect(record).toEqual({ 1: "a", 2: "b" });
    expect(hasKey(record, 2)).toBe(true);
    expect(hasKey(record, 3)).toBe(false);
  });
});

describe("course-form model", () => {
  it("maps known course field issues and flags unknown ones", () => {
    expect(
      mapCourseFieldIssues([
        { field: "course_id", key: "duplicate" },
        { field: "name", key: "duplicate" },
        { field: "semester", key: "unknown" },
      ]),
    ).toEqual({
      fieldErrors: {
        courseId: "This course ID is already in use.",
        name: "A course without an ID already has this name in this group and semester.",
      },
      hasUnmappedIssue: true,
    });
  });

  it("validates route params and detects edit mode", () => {
    expect(parseCourseFormRoute("5", undefined)).toMatchObject({ isEditMode: false, error: null });
    expect(parseCourseFormRoute("5", "9")).toMatchObject({ isEditMode: true, courseId: 9 });
    expect(parseCourseFormRoute("x", undefined).error).toBe("Invalid dance group id");
    expect(parseCourseFormRoute("5", "y").error).toBe("Invalid course id");
  });

  it("requires a course id or a name", () => {
    expect(hasCourseIdentifier(emptyCourseForm)).toBe(false);
    expect(hasCourseIdentifier({ ...emptyCourseForm, name: "  " })).toBe(false);
    expect(hasCourseIdentifier({ ...emptyCourseForm, courseId: "7" })).toBe(true);
  });

  it("maps a course to form values and back to payloads", () => {
    const values = toCourseFormValues({
      id: 9,
      course_id: 9,
      name: "Existing",
      semester: "WS 25",
      start_date: "2025-01-01",
      trainer_id: 2,
    } as DanceCourse);
    expect(values).toMatchObject({ courseId: "9", name: "Existing", trainerId: "2" });

    expect(toCreateCoursePayload(values, 5)).toMatchObject({
      danceGroupId: 5,
      semester: "WS 25",
      courseId: 9,
      trainerId: 2,
    });
    expect(toUpdateCoursePayload({ ...emptyCourseForm, name: " X ", semester: "" })).toMatchObject({
      name: "X",
      semester: undefined,
      trainerId: undefined,
    });
  });
});
