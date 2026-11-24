import type { LearningStatus } from "../../../types";

export interface PersonalTab {
  status: LearningStatus;
  label: string;
  emoji: string;
  count: number | null;
  emptyMessage: string;
}

const EMPTY_MESSAGES: Record<LearningStatus, string> = {
  wishlist: "Your wishlist is empty. Add dances with the 🤍 button on a choreography card.",
  learned: "No learned dances yet. Mark dances with the ✅ button on a choreography card.",
};

/** `count` is null while a list is still loading, so the tab does not claim to be empty. */
export function buildPersonalTabs(
  options: readonly { value: LearningStatus; label: string; emoji: string }[],
  counts: Record<LearningStatus, number | null>,
): PersonalTab[] {
  return options.map((option) => ({
    status: option.value,
    label: option.label,
    emoji: option.emoji,
    count: counts[option.value],
    emptyMessage: EMPTY_MESSAGES[option.value],
  }));
}
