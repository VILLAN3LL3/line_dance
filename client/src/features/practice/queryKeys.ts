// The keys live under the choreographies root, so everything that refreshes choreographies also
// refreshes the practice data: marking a dance as learned records its first practice.
export const practiceKeys = {
  all: ["choreographies", "practice"] as const,
  suggestions: ["choreographies", "practice", "suggestions"] as const,
  log: ["choreographies", "practice", "log"] as const,
  intervals: ["choreographies", "practice", "intervals"] as const,
};
