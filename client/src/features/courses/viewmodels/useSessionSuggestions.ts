import { useState } from "react";

import type { StepFigureSuggestion } from "../../../types";
import { getSessionStepFigureSuggestions } from "../api";
import { hasKey, omitKey } from "../model/course-detail";
import { useGenresQuery } from "../../metadata";

/** Step figure suggestions per session; toggling an open session hides its suggestions again. */
export const useSessionSuggestions = (onError: (message: string) => void) => {
  const [suggestions, setSuggestions] = useState<Record<number, StepFigureSuggestion[]>>({});
  const [knownFigures, setKnownFigures] = useState<Record<number, string[]>>({});
  const [maxLevelValue, setMaxLevelValue] = useState<number | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);
  const genresQuery = useGenresQuery();
  const [music, setMusic] = useState<{
    minBpm: number | null;
    maxBpm: number | null;
    genres: string[];
  }>({ minBpm: null, maxBpm: null, genres: [] });

  const toggle = async (sessionId: number) => {
    if (hasKey(suggestions, sessionId)) {
      setSuggestions((previous) => omitKey(previous, sessionId));
      setKnownFigures((previous) => omitKey(previous, sessionId));
      return;
    }

    setLoadingSessionId(sessionId);
    try {
      const result = await getSessionStepFigureSuggestions(sessionId, music);
      setSuggestions((previous) => ({ ...previous, [sessionId]: result.suggestions }));
      setKnownFigures((previous) => ({ ...previous, [sessionId]: result.known_step_figures }));
      setMaxLevelValue(result.max_level_value);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoadingSessionId(null);
    }
  };

  const clear = () => {
    setSuggestions({});
    setKnownFigures({});
  };

  return {
    state: {
      suggestions,
      knownFigures,
      maxLevelValue,
      loadingSessionId,
      music,
      genreOptions: genresQuery.data ?? [],
    },
    actions: { toggle, clear, setMusic },
  };
};
