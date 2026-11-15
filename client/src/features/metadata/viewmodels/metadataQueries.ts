import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getAuthors, getCountryCodes, getLevels, getStepFigures, getTags } from "../api";
import { metadataKeys } from "../queryKeys";

export function useLevelsQuery() {
  return useQuery({ queryKey: metadataKeys.levels, queryFn: getLevels });
}

export function useTagsQuery() {
  return useQuery({ queryKey: metadataKeys.tags, queryFn: getTags });
}

export function useAuthorsQuery() {
  return useQuery({ queryKey: metadataKeys.authors, queryFn: getAuthors });
}

export function useStepFiguresQuery() {
  return useQuery({ queryKey: metadataKeys.stepFigures, queryFn: getStepFigures });
}

/** Imperative loader for one-off needs (e.g. clipboard export); always asks the server. */
export function useCountryCodesLoader() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.fetchQuery({ queryKey: metadataKeys.countryCodes, queryFn: getCountryCodes });
}
