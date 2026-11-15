import type { DanceCourse, Session } from "../../../types";
import { getCourseStatus, normalizeDate, type CourseStatus } from "../../courses";

export interface CourseWithStatus {
  course: DanceCourse;
  status: CourseStatus;
  nextPlannedDate: string | null;
}

/** For planned courses: the next session date, else the start date if it is still ahead. */
const findNextPlannedDate = (
  course: DanceCourse,
  courseSessions: Session[],
  berlinTodayIso: string,
): string | null => {
  const nextSessionDate = courseSessions
    .map((session) => normalizeDate(session.session_date))
    .filter((date) => date > berlinTodayIso)
    .sort((a, b) => a.localeCompare(b))[0];
  if (nextSessionDate) return nextSessionDate;

  if (course.start_date) {
    const startDate = normalizeDate(course.start_date);
    if (startDate > berlinTodayIso) return startDate;
  }
  return null;
};

export const buildCoursesWithStatus = (
  courses: DanceCourse[],
  sessionsByCourseId: Record<number, Session[]>,
  berlinTodayIso: string,
): CourseWithStatus[] =>
  courses.map((course) => {
    const courseSessions = sessionsByCourseId[course.id] ?? [];
    const status = getCourseStatus(course, courseSessions, berlinTodayIso);
    const nextPlannedDate =
      status === "planned" ? findNextPlannedDate(course, courseSessions, berlinTodayIso) : null;
    return { course, status, nextPlannedDate };
  });

const findNextPlannedCourseId = (coursesWithStatus: CourseWithStatus[]): number | null =>
  [...coursesWithStatus]
    .filter(({ status }) => status === "planned")
    .sort((a, b) => {
      const dateComparison = (a.nextPlannedDate ?? "9999-12-31").localeCompare(
        b.nextPlannedDate ?? "9999-12-31",
      );
      return dateComparison !== 0 ? dateComparison : a.course.id - b.course.id;
    })[0]?.course.id ?? null;

/**
 * Running courses are always shown; planned and passed ones on request. Without any running
 * course and without filters, the next planned course is shown instead.
 */
export const selectVisibleCourses = (
  coursesWithStatus: CourseWithStatus[],
  showPlanned: boolean,
  showPassed: boolean,
): DanceCourse[] => {
  const hasRunning = coursesWithStatus.some(({ status }) => status === "running");
  const nextPlannedCourseId = hasRunning ? null : findNextPlannedCourseId(coursesWithStatus);
  const visibleStatuses = new Set<CourseStatus>([
    "running",
    ...(showPlanned ? ["planned" as const] : []),
    ...(showPassed ? ["passed" as const] : []),
  ]);

  return coursesWithStatus
    .filter(({ course, status }) =>
      !showPlanned && !showPassed && !hasRunning
        ? status === "planned" && course.id === nextPlannedCourseId
        : visibleStatuses.has(status),
    )
    .map(({ course }) => course);
};
