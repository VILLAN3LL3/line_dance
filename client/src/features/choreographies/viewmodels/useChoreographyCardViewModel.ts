import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { copyTextWithPromptFallback } from "../../../shared/browser/clipboard";
import type { Choreography } from "../../../types";
import { useCountryCodesLoader } from "../../metadata";
import { deleteChoreographyRating, setChoreographyRating } from "../api";
import { buildChoreographyClipboardText } from "../model/choreography-clipboard";

/** ViewModel for a choreography card: optimistic rating and the copy-to-clipboard action. */
export const useChoreographyCardViewModel = (choreography: Choreography) => {
  const [rating, setRating] = useState<number | null>(choreography.rating);
  const loadCountryCodes = useCountryCodesLoader();
  const ratingMutation = useMutation({
    mutationFn: async (newRating: number | null) => {
      if (newRating === null) {
        await deleteChoreographyRating(choreography.id);
      } else {
        await setChoreographyRating(choreography.id, newRating);
      }
    },
  });

  const changeRating = async (newRating: number | null) => {
    const previous = rating;
    setRating(newRating);
    try {
      await ratingMutation.mutateAsync(newRating);
    } catch {
      setRating(previous);
    }
  };

  const copyToClipboard = async () => {
    const countryCodes = await loadCountryCodes().catch(() => ({}));
    const text = buildChoreographyClipboardText(choreography, countryCodes);
    await copyTextWithPromptFallback(text, "Copy choreography details:");
  };

  return { state: { rating }, actions: { changeRating, copyToClipboard } };
};
