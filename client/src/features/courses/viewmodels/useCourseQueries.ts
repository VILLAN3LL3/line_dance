import { useQuery } from "@tanstack/react-query";

import { getDanceCourses, getSessionChoreographies, getSessions } from "../api";
import { courseKeys } from "../queryKeys";

export function useCoursesQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: courseKeys.list(groupId),
    queryFn: () => getDanceCourses(groupId),
    enabled,
  });
}

export function useSessionsQuery(courseId: number, enabled = true) {
  return useQuery({
    queryKey: courseKeys.sessions(courseId),
    queryFn: () => getSessions(courseId),
    enabled,
  });
}

/** Sessions of every course (used for per-course summaries on the group page). */
export function useAllSessionsQuery(enabled = true) {
  return useQuery({
    queryKey: courseKeys.allSessions,
    queryFn: () => getSessions(),
    enabled,
  });
}

export function useSessionChoreographiesQuery(sessionId: number | null) {
  return useQuery({
    queryKey: courseKeys.sessionChoreographies(sessionId ?? -1),
    queryFn: () => getSessionChoreographies(sessionId as number),
    enabled: sessionId !== null,
  });
}
