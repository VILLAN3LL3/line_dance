import { useQuery } from "@tanstack/react-query";

import { getDanceGroup, getDanceGroups } from "../api";
import { danceGroupKeys } from "../queryKeys";

export function useDanceGroupsQuery(enabled = true) {
  return useQuery({ queryKey: danceGroupKeys.list, queryFn: getDanceGroups, enabled });
}

export function useDanceGroupQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: danceGroupKeys.detail(id),
    queryFn: () => getDanceGroup(id),
    enabled,
  });
}
