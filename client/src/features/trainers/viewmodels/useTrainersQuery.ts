import { useQuery } from "@tanstack/react-query";

import { getTrainers } from "../api";
import { trainerKeys } from "../queryKeys";

export function useTrainersQuery() {
  return useQuery({ queryKey: trainerKeys.all, queryFn: getTrainers });
}
