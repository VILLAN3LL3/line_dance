import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PracticeBaselineRequest, PracticeLogRequest } from "../../../types";
import {
  deletePracticeEntry,
  fetchPracticeIntervals,
  fetchPracticeLog,
  fetchPracticeSuggestions,
  logPractice,
  setPracticeBaseline,
} from "../api";
import { practiceKeys } from "../queryKeys";

export function usePracticeSuggestionsQuery() {
  return useQuery({ queryKey: practiceKeys.suggestions, queryFn: fetchPracticeSuggestions });
}

/** The interval ladder never changes while the app runs, so it is fetched once. */
export function usePracticeIntervalsQuery() {
  return useQuery({
    queryKey: practiceKeys.intervals,
    queryFn: fetchPracticeIntervals,
    staleTime: Infinity,
  });
}

export function usePracticeLogQuery() {
  return useQuery({ queryKey: practiceKeys.log, queryFn: () => fetchPracticeLog() });
}

/** Every practice change refreshes the suggestions and the log together. */
export function useLogPracticeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PracticeLogRequest) => logPractice(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: practiceKeys.all }),
  });
}

export function useDeletePracticeEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePracticeEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: practiceKeys.all }),
  });
}

export function useSetBaselineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PracticeBaselineRequest) => setPracticeBaseline(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: practiceKeys.all }),
  });
}
