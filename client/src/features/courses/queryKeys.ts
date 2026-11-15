export const courseKeys = {
  all: ["courses"] as const,
  list: (groupId: number) => ["courses", "list", groupId] as const,
  allSessions: ["courses", "sessions", "all"] as const,
  sessions: (courseId: number) => ["courses", "sessions", courseId] as const,
  sessionChoreographies: (sessionId: number) =>
    ["courses", "session-choreographies", sessionId] as const,
};
