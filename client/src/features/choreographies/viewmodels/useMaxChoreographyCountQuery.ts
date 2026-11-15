import { useQuery } from "@tanstack/react-query";

import { getMaxChoreographyCount } from "../api";
import { choreographyKeys } from "../queryKeys";

export function useMaxChoreographyCountQuery() {
  return useQuery({ queryKey: choreographyKeys.maxCount, queryFn: getMaxChoreographyCount });
}
