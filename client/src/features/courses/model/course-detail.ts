import type { Choreography, DanceCourse, Session, SessionChoreography } from "../../../types";

type NumericRecord<T> = Record<number, T>;

export const getChoreographyOptionLabel = (choreography: Choreography): string =>
  `${choreography.name} (${choreography.level})`;

/** Parses `:groupId` / `:courseId` route params; either invalid value yields the same error. */
export function parseCourseDetailRoute(groupId?: string, courseId?: string) {
  const parsedGroupId = Number(groupId);
  const parsedCourseId = Number(courseId);
  const isValid = Number.isFinite(parsedGroupId) && Number.isFinite(parsedCourseId);
  return {
    groupId: parsedGroupId,
    courseId: parsedCourseId,
    error: isValid ? null : "Invalid route parameters",
  };
}

export const formatCourseHeader = (course: DanceCourse | null): string => {
  const identifier = course?.course_id ?? course?.name ?? "";
  const semester = course?.semester ? ` (${course.semester})` : "";
  return `${identifier}${semester}`;
};

export const filterVisibleSessions = (
  sessions: Session[],
  showPassedSessions: boolean,
  berlinTodayIso: string,
): Session[] =>
  showPassedSessions
    ? sessions
    : sessions.filter((session) => session.session_date.slice(0, 10) >= berlinTodayIso);

/** Choreographies not yet part of the session. */
export const getSelectableChoreographies = (
  available: Choreography[],
  sessionChoreographies: SessionChoreography[],
): Choreography[] =>
  available.filter(
    (choreography) =>
      !sessionChoreographies.some((item) => item.choreography_id === choreography.id),
  );

/** The picker input accepts either the full option label or the plain name. */
export const findChoreographyByQuery = (
  selectable: Choreography[],
  query: string,
): Choreography | undefined =>
  selectable.find(
    (choreography) =>
      getChoreographyOptionLabel(choreography) === query || choreography.name === query,
  );

export const omitKey = <T>(record: NumericRecord<T>, key: number): NumericRecord<T> => {
  const next = { ...record };
  delete next[key];
  return next;
};

export const hasKey = (record: NumericRecord<unknown>, key: number): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

/** `Kurs-<courseId>-<semester>.pdf` with the semester reduced to filename-safe characters. */
export const buildCoursePdfFileName = (course: DanceCourse): string => {
  const safeSemester = (course.semester ?? "Kurs")
    .split(/[^a-zA-Z0-9_-]+/)
    .filter(Boolean)
    .join("_");
  const courseFilePart =
    course.course_id === null || course.course_id === undefined ? "" : `${course.course_id}-`;
  return `Kurs-${courseFilePart}${safeSemester}.pdf`;
};
