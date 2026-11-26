import { useLearningStatusChoreographiesQuery } from "../../choreographies";
import { buildPracticeDeck } from "../model/practice-deck";
import { usePracticeSuggestionsQuery } from "./usePracticeQueries";

/** Number of dances to practice now; null while the data is loading or could not be loaded. */
export const usePracticeDueCount = (): number | null => {
  const learned = useLearningStatusChoreographiesQuery("learned");
  const suggestions = usePracticeSuggestionsQuery();
  if (learned.data === undefined || suggestions.data === undefined) return null;
  return buildPracticeDeck(learned.data, suggestions.data).due.length;
};
