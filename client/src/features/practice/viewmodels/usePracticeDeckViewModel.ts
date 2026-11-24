import { useState } from "react";

import type { Choreography } from "../../../types";
import { useLearningStatusChoreographiesQuery } from "../../choreographies";
import { buildPracticeDeck, filterDeckByName } from "../model/practice-deck";
import { buildLogRequest } from "../model/practice-log";
import type { PracticeDraft } from "../model/practice-log";
import { useLogPracticeMutation, usePracticeSuggestionsQuery } from "./usePracticeQueries";

export type CardPractice = Omit<PracticeDraft, "choreographyIds">;

/** The flash card box: learned dances with their practice state, due ones first. */
export const usePracticeDeckViewModel = (query = "") => {
  const learned = useLearningStatusChoreographiesQuery("learned");
  const suggestions = usePracticeSuggestionsQuery();
  const mutation = useLogPracticeMutation();
  const [showLater, setShowLater] = useState(false);

  const isFiltered = query.trim() !== "";
  const deck = filterDeckByName(
    buildPracticeDeck(learned.data ?? [], suggestions.data ?? []),
    query,
  );

  const practice = async (choreography: Choreography, draft: CardPractice) => {
    try {
      await mutation.mutateAsync(buildLogRequest({ ...draft, choreographyIds: [choreography.id] }));
    } catch {
      // The failure is shown through `saveError`.
    }
  };

  return {
    state: {
      deck,
      isLoading: learned.isPending || suggestions.isPending,
      error: learned.isError || suggestions.isError ? "Failed to load your practice cards" : null,
      saveError: mutation.isError ? "Failed to save your practice" : null,
      practicingId: mutation.isPending ? (mutation.variables.choreography_ids[0] ?? null) : null,
      isFiltered,
      showLater,
    },
    actions: { practice, toggleLater: () => setShowLater((current) => !current) },
  };
};

export type PracticeDeckViewModel = ReturnType<typeof usePracticeDeckViewModel>;
