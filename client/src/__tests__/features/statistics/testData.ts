import type { RepertoireStatistics } from "../../../types";

export const statistics: RepertoireStatistics = {
  total: 8,
  levels: [
    { key: "beginner", label: "BEGINNER", count: 6 },
    { key: "improver", label: "IMPROVER", count: 2 },
  ],
  tempo: [
    { key: "bpm-0", label: "Below 100 BPM", count: 0 },
    { key: "bpm-100", label: "100–119 BPM", count: 4 },
    { key: "unknown", label: "Unknown", count: 4 },
  ],
  genres: [
    { key: "country", label: "Country", count: 5 },
    { key: "unknown", label: "Unknown", count: 3 },
  ],
  choreographers: [{ key: "ann", label: "Ann", count: 3 }],
  other_choreographers: 2,
  years: [
    { key: "2019", label: "2019", count: 3 },
    { key: "2021", label: "2021", count: 5 },
  ],
  timeline: {
    months: [
      { month: "2026-01", learned: 3, total_learned: 4, practices: 0 },
      { month: "2026-02", learned: 0, total_learned: 4, practices: 6 },
      { month: "2026-03", learned: 4, total_learned: 8, practices: 2 },
    ],
    undated: 1,
  },
};
