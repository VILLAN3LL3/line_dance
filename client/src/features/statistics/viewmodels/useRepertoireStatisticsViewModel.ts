import { useQuery } from "@tanstack/react-query";

import { fetchRepertoireStatistics } from "../api";
import { statisticsKeys } from "../queryKeys";

/** The repertoire dashboard: statistics over the learned dances. */
export const useRepertoireStatisticsViewModel = () => {
  const query = useQuery({
    queryKey: statisticsKeys.repertoire,
    queryFn: fetchRepertoireStatistics,
  });

  return {
    state: {
      statistics: query.data ?? null,
      isLoading: query.isPending,
      error: query.isError ? "Failed to load your statistics" : null,
    },
  };
};

export type RepertoireStatisticsViewModel = ReturnType<typeof useRepertoireStatisticsViewModel>;
