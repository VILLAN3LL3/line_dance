import type { LearningStatus } from "../../../types";

export interface LearningStatusOption {
  value: LearningStatus;
  label: string;
  emoji: string;
}

export const LEARNING_STATUS_OPTIONS: readonly LearningStatusOption[] = [
  { value: "wishlist", label: "Wishlist", emoji: "🤍" },
  { value: "learned", label: "Learned", emoji: "✅" },
];

export const getLearningStatusOption = (
  status: LearningStatus | null | undefined,
): LearningStatusOption | null =>
  LEARNING_STATUS_OPTIONS.find((option) => option.value === status) ?? null;

/** Clicking the active status again clears it; any other status replaces the current one. */
export const toggleLearningStatus = (
  current: LearningStatus | null,
  clicked: LearningStatus,
): LearningStatus | null => (current === clicked ? null : clicked);

/** The date is the day the status was set; entries migrated from hashtags have none. */
export const describeLearningStatus = (status: LearningStatus, date: string | null): string => {
  const label = getLearningStatusOption(status)?.label ?? status;
  return date ? `${label} since ${date}` : label;
};
