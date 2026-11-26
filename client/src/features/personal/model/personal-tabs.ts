import type { LearningStatus } from "../../../types";

export type PersonalTabId = LearningStatus | "practice" | "log" | "dashboard";

export interface PersonalTab {
  id: PersonalTabId;
  label: string;
  emoji: string;
  count: number | null;
  emptyMessage: string;
}

const EMPTY_MESSAGES: Record<LearningStatus, string> = {
  wishlist: "Your wishlist is empty. Add dances with the 🤍 button on a choreography card.",
  learned: "No learned dances yet. Mark dances with the ✅ button on a choreography card.",
};

/** Tabs that list choreographies by status; the others have their own content. */
export const isStatusTab = (id: PersonalTabId): id is LearningStatus =>
  id === "wishlist" || id === "learned";

/** `count` is null while a list is still loading, so the tab does not claim to be empty. */
export function buildPersonalTabs(
  options: readonly { value: LearningStatus; label: string; emoji: string }[],
  counts: Partial<Record<PersonalTabId, number | null>>,
): PersonalTab[] {
  const statusTabs: PersonalTab[] = options.map((option) => ({
    id: option.value,
    label: option.label,
    emoji: option.emoji,
    count: counts[option.value] ?? null,
    emptyMessage: EMPTY_MESSAGES[option.value],
  }));
  return [
    ...statusTabs,
    {
      id: "practice",
      label: "Practice",
      emoji: "🔁",
      count: counts.practice ?? null,
      emptyMessage: "",
    },
    { id: "log", label: "Practice log", emoji: "📓", count: null, emptyMessage: "" },
    { id: "dashboard", label: "Dashboard", emoji: "📊", count: null, emptyMessage: "" },
  ];
}

/** The search field filters the dance lists, the practice cards and the log, not the statistics. */
export const isSearchableTab = (id: PersonalTabId): boolean => id !== "dashboard";
