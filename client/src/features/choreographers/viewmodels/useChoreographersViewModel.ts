import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { openInNewTab } from "../../../shared/browser/window";
import { useLevelsQuery } from "../../metadata";
import { getAuthorStats } from "../api";
import {
  buildAuthorSearchPath,
  filterAndSortAuthors,
  getAriaSort,
  levelNamesByValue,
  nextSort,
  toggleInSet,
  type SortDir,
  type SortField,
} from "../model/author-stats";
import { choreographerKeys } from "../queryKeys";

/** ViewModel for the choreographers overview: author statistics with name/level filters and sorting. */
export const useChoreographersViewModel = () => {
  const statsQuery = useQuery({ queryKey: choreographerKeys.stats, queryFn: getAuthorStats });
  const levelsQuery = useLevelsQuery();

  const [nameFilter, setNameFilter] = useState("");
  const [activeLevels, setActiveLevels] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "total",
    dir: "desc",
  });

  const levels = levelsQuery.data;
  const levelNames = useMemo(() => levelNamesByValue(levels ?? []), [levels]);
  const rows = useMemo(
    () => filterAndSortAuthors(statsQuery.data ?? [], nameFilter, activeLevels, sort),
    [statsQuery.data, nameFilter, activeLevels, sort],
  );

  const hasFailed = statsQuery.isError || levelsQuery.isError;
  useEffect(() => {
    const failure = statsQuery.error ?? levelsQuery.error;
    if (failure) console.error(failure);
  }, [statsQuery.error, levelsQuery.error]);

  return {
    state: {
      isLoading: statsQuery.isPending || levelsQuery.isPending,
      error: hasFailed ? "Failed to load choreographer statistics." : null,
      rows,
      levelNames,
      nameFilter,
      activeLevels,
      sort,
    },
    actions: {
      changeNameFilter: setNameFilter,
      toggleLevel: (level: string) => setActiveLevels((previous) => toggleInSet(previous, level)),
      sortBy: (field: SortField) => setSort((current) => nextSort(current, field)),
      getAriaSort: (field: SortField) => getAriaSort(sort, field),
      searchAuthor: (author: string, level?: string) =>
        openInNewTab(buildAuthorSearchPath(author, level)),
    },
  };
};
