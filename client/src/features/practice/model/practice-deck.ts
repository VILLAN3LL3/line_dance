import { matchesName } from "../../../shared/utils/search";
import type { Choreography, ChoreographyInformation, PracticeSummary } from "../../../types";

export interface PracticeCard {
  choreography: Choreography;
  summary: PracticeSummary;
}

export interface PracticeDeck {
  due: PracticeCard[];
  later: PracticeCard[];
}

/** A learned dance the server did not report yet has no practice entries and is due right away. */
const unpracticed = (choreography: Choreography): PracticeSummary => ({
  choreography_id: choreography.id,
  last_practiced_on: null,
  last_note: null,
  practice_count: 0,
  next_due_on: null,
  is_due: true,
  days_overdue: null,
});

/**
 * Pairs the learned dances with their practice state. The server order (most urgent first) is
 * kept; dances without a server summary come first because they were never practiced.
 */
export function buildPracticeDeck(
  learned: readonly Choreography[],
  suggestions: readonly PracticeSummary[],
): PracticeDeck {
  const summaries = new Map(suggestions.map((summary) => [summary.choreography_id, summary]));
  const dances = new Map(learned.map((choreography) => [choreography.id, choreography]));
  const unknown = learned
    .filter((choreography) => !summaries.has(choreography.id))
    .map((choreography) => ({ choreography, summary: unpracticed(choreography) }));
  const known = suggestions.flatMap((summary) => {
    const choreography = dances.get(summary.choreography_id);
    return choreography ? [{ choreography, summary }] : [];
  });
  const cards = [...unknown, ...known];
  return {
    due: cards.filter((card) => card.summary.is_due),
    later: cards.filter((card) => !card.summary.is_due),
  };
}

export interface PracticeCardGroup {
  /** The due date shared by the cards, or "never" for dances without any practice. */
  key: string;
  label: string;
  cards: PracticeCard[];
}

/**
 * Groups cards by their due date, never practiced dances first, then the oldest date first. Inside
 * a group the order of the server (most urgent first) is kept.
 */
export function groupCardsByDueDate(cards: readonly PracticeCard[]): PracticeCardGroup[] {
  const groups = new Map<string, PracticeCardGroup>();
  cards.forEach((card) => {
    const key = card.summary.next_due_on ?? "never";
    const group = groups.get(key) ?? { key, label: describeNextDue(card.summary), cards: [] };
    group.cards.push(card);
    groups.set(key, group);
  });
  const rank = (group: PracticeCardGroup) => (group.key === "never" ? 0 : 1);
  return [...groups.values()].sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key));
}

export function filterDeckByName(deck: PracticeDeck, query: string): PracticeDeck {
  const matches = (card: PracticeCard) => matchesName(card.choreography.name, query);
  return { due: deck.due.filter(matches), later: deck.later.filter(matches) };
}

export const describeLastPractice = (summary: PracticeSummary): string =>
  summary.last_practiced_on ? summary.last_practiced_on : "Not practiced yet";

export function describePracticeCount(count: number): string {
  if (count === 0) return "Never";
  return count === 1 ? "Once" : `${count} times`;
}

export function describeNextDue(summary: PracticeSummary): string {
  if (summary.next_due_on === null) return "Due now";
  if (!summary.is_due) return `Due ${summary.next_due_on}`;
  return summary.days_overdue === 0 ? "Due today" : `Overdue since ${summary.next_due_on}`;
}

const MEMORY_AID_ORDER = ["restart", "tag"];

const memoryAidRank = (category: string): number => {
  const index = MEMORY_AID_ORDER.indexOf(category.toLowerCase());
  return index === -1 ? MEMORY_AID_ORDER.length : index;
};

/** Restarts and tags first: they are what dancers forget most. Blank descriptions are dropped. */
export function getMemoryAids(choreography: Choreography): ChoreographyInformation[] {
  return (choreography.choreography_information ?? [])
    .filter((information) => information.description.trim() !== "")
    .map((information, position) => ({ information, position }))
    .sort(
      (a, b) =>
        memoryAidRank(a.information.category) - memoryAidRank(b.information.category) ||
        a.position - b.position,
    )
    .map(({ information }) => information);
}
