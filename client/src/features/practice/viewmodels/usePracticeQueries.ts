import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PracticeLogRequest } from "../../../types";
import {
  deletePracticeEntry,
  fetchPracticeLog,
  fetchPracticeSuggestions,
  logPractice,
} from "../api";
import { practiceKeys } from "../queryKeys";

export function usePracticeSuggestionsQuery() {
  return useQuery({ queryKey: practiceKeys.suggestions, queryFn: fetchPracticeSuggestions });
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
