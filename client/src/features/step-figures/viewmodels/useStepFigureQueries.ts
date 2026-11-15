import { useQuery } from "@tanstack/react-query";

import { getStepFiguresWithIds } from "../api";
import { stepFigureKeys } from "../queryKeys";

export function useStepFiguresWithIdsQuery() {
  return useQuery({ queryKey: stepFigureKeys.withIds, queryFn: getStepFiguresWithIds });
}
