import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { PracticeBaselineRequest, PracticeLogRequest } from "../../../types";
import {
  deletePracticeEntry,
  fetchPracticeIntervals,
  fetchPracticeLog,
  fetchPracticeSuggestions,
  logPractice,
  setPracticeBaseline,
} from "../api";
import { LOG_PAGE_SIZE } from "../model/practice-log";
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

/** The log page by page; `name` is filtered on the server so that every match can be reached. */
export function usePracticeLogQuery(name: string) {
  const q = name.trim();
  return useInfiniteQuery({
    queryKey: [...practiceKeys.log, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPracticeLog({ limit: LOG_PAGE_SIZE, offset: pageParam, q }),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.data.length, 0);
      return lastPage.data.length > 0 && loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
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
