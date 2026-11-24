import { useReducer, useState } from "react";

import { useLearningStatusChoreographiesQuery } from "../../choreographies";
import { buildLogRequest, filterByName, formatLocalDate } from "../model/practice-log";
import { buildStepOptions } from "../model/practice-steps";
import { createQuickLogState, describeSaved, quickLogReducer } from "../model/quick-log";
import type { QuickLogMode } from "../model/quick-log";
import {
  useLogPracticeMutation,
  usePracticeIntervalsQuery,
  useSetBaselineMutation,
} from "./usePracticeQueries";

/** Quick capture: log several learned dances for one day in a single step. */
export const useQuickLogViewModel = () => {
  const learned = useLearningStatusChoreographiesQuery("learned");
  const intervals = usePracticeIntervalsQuery();
  const practiceMutation = useLogPracticeMutation();
  const baselineMutation = useSetBaselineMutation();
  const [form, dispatch] = useReducer(quickLogReducer, undefined, () =>
    createQuickLogState(formatLocalDate(new Date())),
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    if (form.mode === "baseline") {
      const result = await baselineMutation.mutateAsync({
        choreography_ids: form.selected,
        step: form.step,
        spread: form.spread,
      });
      return describeSaved("baseline", result.updated, result.step);
    }
    const result = await practiceMutation.mutateAsync(
      buildLogRequest({
        choreographyIds: form.selected,
        practicedOn: form.practicedOn,
        confidence: form.confidence,
        note: form.note,
      }),
    );
    return describeSaved("practice", result.logged, form.step);
  };

  const submit = async () => {
    if (form.selected.length === 0) return;
    setSavedMessage(null);
    setFailed(false);
    try {
      setSavedMessage(await save());
      dispatch({ type: "saved", today: formatLocalDate(new Date()) });
    } catch {
      setFailed(true);
    }
  };

  const failureMessage =
    form.mode === "baseline" ? "Failed to set the interval step" : "Failed to save your practice";
  const dances = filterByName(learned.data ?? [], form.query);

  return {
    state: {
      form,
      maxDate: formatLocalDate(new Date()),
      dances,
      stepOptions: buildStepOptions(intervals.data ?? []),
      hasLearnedDances: (learned.data?.length ?? 0) > 0,
      isSaving: practiceMutation.isPending || baselineMutation.isPending,
      savedMessage,
      error: failed ? failureMessage : null,
    },
    actions: {
      toggleOpen: () => dispatch({ type: "toggle-open" }),
      setMode: (mode: QuickLogMode) => dispatch({ type: "set-mode", mode }),
      setStep: (step: number) => dispatch({ type: "set-step", step }),
      setSpread: (spread: boolean) => dispatch({ type: "set-spread", spread }),
      selectShown: () => dispatch({ type: "select-all", ids: dances.map((dance) => dance.id) }),
      clearSelection: () => dispatch({ type: "clear-selection" }),
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
