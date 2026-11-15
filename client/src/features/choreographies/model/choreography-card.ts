import type { Choreography } from "../../../types";

export function getCountWallSummary(
  choreography: Choreography,
): { label: string; value: string } | null {
  if (choreography.count != null && choreography.wall_count != null) {
    return { label: "Count/Wall", value: `${choreography.count} / ${choreography.wall_count}` };
  }

  if (choreography.count != null) {
    return { label: "Count", value: String(choreography.count) };
  }

  if (choreography.wall_count != null) {
    return { label: "Wall", value: String(choreography.wall_count) };
  }

  return null;
}

const INFORMATION_CATEGORY_ICONS: Record<string, string> = {
  restart: "🔁",
  tag: "🌉",
  ending: "🏁",
  intro: "➡️",
  sequence: "🆎",
  styling: "💅",
};

export function getInformationCategoryIcon(category: string): string {
  return INFORMATION_CATEGORY_ICONS[category.toLowerCase()] || "ℹ️";
}
