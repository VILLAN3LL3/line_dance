import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { copyTextWithPromptFallback } from "../../../shared/browser/clipboard";
import type { Choreography, LearningStatus } from "../../../types";
import { useCountryCodesLoader } from "../../metadata";
import {
  deleteChoreographyLearningStatus,
  deleteChoreographyRating,
  setChoreographyLearningStatus,
  setChoreographyRating,
} from "../api";
import { buildChoreographyClipboardText } from "../model/choreography-clipboard";
import { choreographyKeys } from "../queryKeys";

/** Page-level card actions: optimistic ratings and learning status, and copy-to-clipboard. */
export const useChoreographyCardViewModel = () => {
  const [ratings, setRatings] = useState<Record<number, number | null>>({});
  // Only in-flight status changes are kept here; afterwards the refreshed queries are the truth.
  const [pendingStatuses, setPendingStatuses] = useState<Record<number, LearningStatus | null>>({});
  const queryClient = useQueryClient();
  const loadCountryCodes = useCountryCodesLoader();
  const ratingMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number | null }) => {
      if (rating === null) {
        await deleteChoreographyRating(id);
      } else {
        await setChoreographyRating(id, rating);
      }
    },
  });

  const learningStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: LearningStatus | null }) => {
      if (status === null) await deleteChoreographyLearningStatus(id);
      else await setChoreographyLearningStatus(id, status);
      await queryClient.invalidateQueries({ queryKey: choreographyKeys.all });
    },
  });

  const learningStatusFor = (choreography: Choreography) => {
    if (!Object.hasOwn(pendingStatuses, choreography.id)) {
      return {
        status: choreography.learning_status,
        date: choreography.learning_status_date,
      };
    }
    const status = pendingStatuses[choreography.id];
    const isUnchanged = status === choreography.learning_status;
    return { status, date: isUnchanged ? choreography.learning_status_date : null };
  };

  const changeLearningStatus = async (
    choreography: Choreography,
    status: LearningStatus | null,
  ) => {
    if (status === learningStatusFor(choreography).status) return;
    setPendingStatuses((current) => ({ ...current, [choreography.id]: status }));
    try {
      await learningStatusMutation.mutateAsync({ id: choreography.id, status });
    } catch {
      // The card falls back to the stored status below.
    } finally {
      setPendingStatuses((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => Number(id) !== choreography.id),
        ),
      );
    }
  };

  const changeRating = async (choreography: Choreography, newRating: number | null) => {
    const previous = Object.hasOwn(ratings, choreography.id)
      ? ratings[choreography.id]
      : choreography.rating;
    setRatings((current) => ({ ...current, [choreography.id]: newRating }));
    try {
      await ratingMutation.mutateAsync({ id: choreography.id, rating: newRating });
    } catch {
      setRatings((current) => ({ ...current, [choreography.id]: previous }));
    }
  };

  const copyToClipboard = async (choreography: Choreography) => {
    const countryCodes = await loadCountryCodes().catch(() => ({}));
    const text = buildChoreographyClipboardText(choreography, countryCodes);
    await copyTextWithPromptFallback(text, "Copy choreography details:");
  };

  return {
    state: {
      ratingFor: (choreography: Choreography) =>
        Object.hasOwn(ratings, choreography.id) ? ratings[choreography.id] : choreography.rating,
      learningStatusFor,
    },
    actions: {
      changeRating: (choreography: Choreography, rating: number | null) =>
        changeRating(choreography, rating),
      changeLearningStatus,
      copyToClipboard,
    },
  };
};

export type ChoreographyCardViewModel = ReturnType<typeof useChoreographyCardViewModel>;
