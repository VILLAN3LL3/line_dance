import { useState } from "react";

import type { Choreography } from "../../../types";
import { findChoreographyByQuery } from "../model/course-detail";

/** Typeahead state for adding a choreography to the selected session. */
export const useChoreographyPicker = (selectable: Choreography[]) => {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");

  return {
    state: { selectedId, query },
    actions: {
      changeQuery: (value: string) => {
        setQuery(value);
        const match = findChoreographyByQuery(selectable, value);
        setSelectedId(match ? String(match.id) : "");
      },
      reset: () => {
        setSelectedId("");
        setQuery("");
      },
    },
  };
};
