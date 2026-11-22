import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { copyTextWithPromptFallback } from "../../../shared/browser/clipboard";
import type { Choreography } from "../../../types";
import { useCountryCodesLoader, useLevelsQuery } from "../../metadata";
import {
  deleteChoreographyPersonalLevel,
  deleteChoreographyRating,
  setChoreographyPersonalLevel,
  setChoreographyRating,
} from "../api";
import { buildChoreographyClipboardText } from "../model/choreography-clipboard";
import { choreographyKeys } from "../queryKeys";

/** Page-level card actions: optimistic ratings, personal levels and the copy-to-clipboard action. */
export const useChoreographyCardViewModel = () => {
  const queryClient = useQueryClient();
  const [ratings, setRatings] = useState<Record<number, number | null>>({});
  const loadCountryCodes = useCountryCodesLoader();
  const levelsQuery = useLevelsQuery();
  const ratingMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number | null }) => {
      if (rating === null) {
        await deleteChoreographyRating(id);
      } else {
        await setChoreographyRating(id, rating);
      }
    },
  });
  // The effective level changes how a choreography is shown, searched and suggested, so every
  // cached choreography query is refreshed instead of patching one entry.
  const personalLevelMutation = useMutation({
    mutationFn: async ({ id, level }: { id: number; level: string | null }) => {
      if (level === null) {
        await deleteChoreographyPersonalLevel(id);
      } else {
        await setChoreographyPersonalLevel(id, level);
      }
      await queryClient.invalidateQueries({ queryKey: choreographyKeys.all });
    },
  });

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
      levelOptions: levelsQuery.data?.map((level) => level.name) ?? [],
      isSavingPersonalLevel: personalLevelMutation.isPending,
      personalLevelError: personalLevelMutation.isError,
    },
    actions: {
      changeRating: (choreography: Choreography, rating: number | null) =>
        changeRating(choreography, rating),
      changePersonalLevel: async (choreography: Choreography, level: string | null) => {
        await personalLevelMutation
          .mutateAsync({ id: choreography.id, level })
          .catch(() => undefined);
      },
      copyToClipboard,
    },
  };
};

export type ChoreographyCardViewModel = ReturnType<typeof useChoreographyCardViewModel>;
