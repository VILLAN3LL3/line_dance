import { useMemo, useState } from "react";

import type { Choreography } from "../../../types";
import { useStepFiguresQuery } from "../../metadata";
import {
  collectInformationCategories,
  nextSort,
  sortAlphabetically,
  sortChoreographies,
  type SortDirection,
  type SortField,
} from "../model/choreography-table";

/** ViewModel for the table display mode: column sorting plus the dynamic step figure columns. */
export const useChoreographyTableViewModel = (choreographies: Choreography[]) => {
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: "name",
    direction: "asc",
  });
  const stepFiguresQuery = useStepFiguresQuery();
  const stepFigures = stepFiguresQuery.data;

  const stepFigureColumns = useMemo(() => sortAlphabetically(stepFigures ?? []), [stepFigures]);
  const informationCategories = useMemo(
    () => collectInformationCategories(choreographies),
    [choreographies],
  );
  const sortedChoreographies = useMemo(
    () => sortChoreographies(choreographies, sort.field, sort.direction),
    [choreographies, sort],
  );

  return {
    state: {
      sortField: sort.field,
      sortDirection: sort.direction,
      sortedChoreographies,
      stepFigureColumns,
      informationCategories,
    },
    actions: {
      toggleSort: (field: SortField) => setSort((current) => nextSort(current, field)),
    },
  };
};
