import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { copyTextWithPromptFallback } from "../../../shared/browser/clipboard";
import type { Choreography } from "../../../types";
import { useCountryCodesLoader } from "../../metadata";
import { deleteChoreographyRating, setChoreographyRating } from "../api";
import { buildChoreographyClipboardText } from "../model/choreography-clipboard";

/** Page-level card actions: optimistic ratings and the copy-to-clipboard action. */
export const useChoreographyCardViewModel = () => {
  const [ratings, setRatings] = useState<Record<number, number | null>>({});
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
    },
    actions: {
      changeRating: (choreography: Choreography, rating: number | null) =>
        changeRating(choreography, rating),
      copyToClipboard,
    },
  };
};

export type ChoreographyCardViewModel = ReturnType<typeof useChoreographyCardViewModel>;
