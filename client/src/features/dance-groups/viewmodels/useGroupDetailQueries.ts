import { useQuery } from "@tanstack/react-query";

import {
  getGroupBaseStepFigures,
  getGroupMaxLevel,
  getLearnedChoreographies,
  getStepFigureSuggestions,
} from "../api";
import { danceGroupKeys } from "../queryKeys";

export function useLearnedChoreographiesQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: danceGroupKeys.learned(groupId),
    queryFn: () => getLearnedChoreographies(groupId),
    enabled,
  });
}

export function useMaxLevelQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: danceGroupKeys.maxLevel(groupId),
    queryFn: () => getGroupMaxLevel(groupId),
    enabled,
  });
}

export function useBaseStepFiguresQuery(groupId: number, enabled = true) {
  return useQuery({
    queryKey: danceGroupKeys.baseStepFigures(groupId),
    queryFn: () => getGroupBaseStepFigures(groupId),
    enabled,
  });
}

/**
 * Suggestions are computed for the group's max level at load time; changing the max level
 * afterwards does not reload them (the key deliberately excludes the level).
 */
export function useStepFigureSuggestionsQuery(
  groupId: number,
  maxLevelValue: number | null,
  enabled: boolean,
  music: { minBpm: number | null; maxBpm: number | null; genres: string[] } = {
    minBpm: null,
    maxBpm: null,
    genres: [],
  },
) {
  return useQuery({
    queryKey: danceGroupKeys.suggestions(groupId, music),
    queryFn: () => getStepFigureSuggestions(groupId, maxLevelValue, music),
    enabled,
  });
}
