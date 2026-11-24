import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LearningStatus } from "../../../types";
import { deleteChoreography, fetchChoreographies, searchChoreographies } from "../api";
import { choreographyKeys } from "../queryKeys";

// Pickers (e.g. adding a choreography to a session) need every choreography, not a page.
const ALL_CHOREOGRAPHIES_LIMIT = 10000;

export function useAllChoreographiesQuery(enabled = true) {
  return useQuery({
    queryKey: choreographyKeys.list,
    queryFn: async () => (await fetchChoreographies(1, ALL_CHOREOGRAPHIES_LIMIT)).data,
    enabled,
  });
}

/** Choreographies on one personal list; refreshed whenever any choreography query is invalidated. */
export function useLearningStatusChoreographiesQuery(status: LearningStatus) {
  return useQuery({
    queryKey: choreographyKeys.byLearningStatus(status),
    queryFn: async () => (await searchChoreographies({ learning_status: status })).data,
  });
}

/** Deletes a choreography and refreshes every cached choreography query. */
export function useDeleteChoreographyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChoreography(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: choreographyKeys.all }),
  });
}
