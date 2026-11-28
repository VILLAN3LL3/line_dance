export const danceGroupKeys = {
  all: ["dance-groups"] as const,
  list: ["dance-groups", "list"] as const,
  detail: (id: number) => ["dance-groups", "detail", id] as const,
  baseStepFigures: (id: number) => ["dance-groups", id, "base-step-figures"] as const,
  maxLevel: (id: number, ...rest: unknown[]) => ["dance-groups", id, "max-level", ...rest] as const,
  levels: (id: number) => ["dance-groups", id, "levels"] as const,
  suggestions: (
    id: number,
    music: { minBpm: number | null; maxBpm: number | null; genres: string[] },
  ) => ["dance-groups", id, "suggestions", music] as const,
  learned: (id: number, ...rest: unknown[]) => ["dance-groups", id, "learned", ...rest] as const,
};
