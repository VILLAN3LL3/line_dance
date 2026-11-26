import type { LearningStatus } from "../../../types";

export type PersonalSectionId = LearningStatus | "practice" | "log" | "dashboard";

export interface PersonalSection {
  id: PersonalSectionId;
  /** Route of the section, also the target of its entry in the sidebar. */
  path: string;
  label: string;
  emoji: string;
  /** Shown next to the label; null while it is not known yet, so nothing claims "0". */
  count: number | null;
  emptyMessage: string;
}

export const PERSONAL_PATH = "/personal";
export const DEFAULT_PERSONAL_SECTION: PersonalSectionId = "dashboard";

const EMPTY_MESSAGES: Record<LearningStatus, string> = {
  wishlist: "Your wishlist is empty. Add dances with the 🤍 button on a choreography card.",
  learned: "No learned dances yet. Mark dances with the ✅ button on a choreography card.",
};

const sectionPath = (id: PersonalSectionId): string => `${PERSONAL_PATH}/${id}`;

/** Sections of the personal area in the order of the sidebar menu. */
export function buildPersonalSections(
  options: readonly { value: LearningStatus; label: string; emoji: string }[],
  counts: Partial<Record<PersonalSectionId, number | null>>,
): PersonalSection[] {
  const statusSections: PersonalSection[] = options.map((option) => ({
    id: option.value,
    path: sectionPath(option.value),
    label: option.label,
    emoji: option.emoji,
    count: counts[option.value] ?? null,
    emptyMessage: EMPTY_MESSAGES[option.value],
  }));
  const dashboard: PersonalSection = {
    id: "dashboard",
    path: sectionPath("dashboard"),
    label: "Dashboard",
    emoji: "📊",
    count: null,
    emptyMessage: "",
  };
  const practice: PersonalSection = {
    id: "practice",
    path: sectionPath("practice"),
    label: "Practice",
    emoji: "🏋️‍♂️",
    count: counts.practice ?? null,
    emptyMessage: "",
  };
  const log: PersonalSection = {
    id: "log",
    path: sectionPath("log"),
    label: "Practice log",
    emoji: "📓",
    count: null,
    emptyMessage: "",
  };
  return [dashboard, ...statusSections, practice, log];
}

/** The section named by the last part of the route, or null for an unknown name. */
export function parsePersonalSection(value: string | undefined): PersonalSectionId | null {
  const known: readonly PersonalSectionId[] = [
    "dashboard",
    "wishlist",
    "learned",
    "practice",
    "log",
  ];
  return known.find((id) => id === value) ?? null;
}

/** Sections with a list of statuses; the others have their own content. */
export const isStatusSection = (id: PersonalSectionId): id is LearningStatus =>
  id === "wishlist" || id === "learned";

/** The search field filters the dance lists, the practice cards and the log, not the statistics. */
export const isSearchableSection = (id: PersonalSectionId): boolean => id !== "dashboard";

/** The heading of a section, e.g. "Practice (3)". */
export const describeSection = (section: PersonalSection): string =>
  section.count === null ? section.label : `${section.label} (${section.count})`;
