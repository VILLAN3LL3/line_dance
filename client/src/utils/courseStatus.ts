import type { DanceCourse, Session } from "../types";

export type CourseStatus = "planned" | "running" | "passed";
export type SessionBadgeStatus = "planned" | "passed";

export const getBerlinTodayIso = (): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
};

export const normalizeDate = (dateString: string): string => dateString.slice(0, 10);

export const getCourseStatus = (
  course: DanceCourse,
  courseSessions: Session[],
  berlinTodayIso: string,
): CourseStatus => {
  if (courseSessions.length > 0) {
    const sessionDates = courseSessions
      .map((session) => normalizeDate(session.session_date))
      .sort((a, b) => a.localeCompare(b));

    const hasPast = sessionDates.some((date) => date < berlinTodayIso);
    const hasFuture = sessionDates.some((date) => date > berlinTodayIso);
    const hasToday = sessionDates.includes(berlinTodayIso);

    if (!hasToday && !hasFuture) {
      return "passed";
    }
    if (!hasToday && !hasPast) {
      return "planned";
    }
    return "running";
  }

  if (course.start_date) {
    return normalizeDate(course.start_date) > berlinTodayIso ? "planned" : "running";
  }

  return "planned";
};

export const getCourseStatusLabel = (status: CourseStatus): string => {
  if (status === "planned") return "Planned";
  if (status === "passed") return "Passed";
  return "Running";
};

export const getSessionBadgeStatus = (
  sessionDate: string,
  berlinTodayIso: string,
): SessionBadgeStatus | null => {
  const normalizedDate = normalizeDate(sessionDate);
  if (normalizedDate > berlinTodayIso) {
    return "planned";
  }
  if (normalizedDate < berlinTodayIso) {
    return "passed";
  }
  return null;
};

export const getSessionBadgeLabel = (status: SessionBadgeStatus): string => {
  if (status === "planned") return "Planned";
  return "Passed";
};
