import { useReducer, useState } from "react";

import { useLearningStatusChoreographiesQuery } from "../../choreographies";
import { buildLogRequest, filterByName, formatLocalDate } from "../model/practice-log";
import { createQuickLogState, quickLogReducer } from "../model/quick-log";
import { useLogPracticeMutation } from "./usePracticeQueries";

/** Quick capture: log several learned dances for one day in a single step. */
export const useQuickLogViewModel = () => {
  const learned = useLearningStatusChoreographiesQuery("learned");
  const mutation = useLogPracticeMutation();
  const [form, dispatch] = useReducer(quickLogReducer, undefined, () =>
    createQuickLogState(formatLocalDate(new Date())),
  );
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const submit = async () => {
    if (form.selected.length === 0) return;
    setSavedCount(null);
    try {
      const result = await mutation.mutateAsync(
        buildLogRequest({
          choreographyIds: form.selected,
          practicedOn: form.practicedOn,
          confidence: form.confidence,
          note: form.note,
        }),
      );
      setSavedCount(result.logged);
      dispatch({ type: "saved", today: formatLocalDate(new Date()) });
    } catch {
      // The failure is shown through `error`.
    }
  };

  return {
    state: {
      form,
      maxDate: formatLocalDate(new Date()),
      dances: filterByName(learned.data ?? [], form.query),
      hasLearnedDances: (learned.data?.length ?? 0) > 0,
      isSaving: mutation.isPending,
      savedCount,
      error: mutation.isError ? "Failed to save your practice" : null,
    },
    actions: {
      toggleOpen: () => dispatch({ type: "toggle-open" }),
      setQuery: (query: string) => dispatch({ type: "set-query", query }),
      toggleDance: (id: number) => dispatch({ type: "toggle-dance", id }),
      setDate: (practicedOn: string) => dispatch({ type: "set-date", practicedOn }),
      setConfidence: (confidence: "sure" | "unsure") =>
        dispatch({ type: "set-confidence", confidence }),
      setNote: (note: string) => dispatch({ type: "set-note", note }),
      submit,
    },
  };
};

export type QuickLogViewModel = ReturnType<typeof useQuickLogViewModel>;
