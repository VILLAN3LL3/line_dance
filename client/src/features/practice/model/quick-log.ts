import type { PracticeConfidence } from "../../../types";
import { DEFAULT_BASELINE_STEP } from "./practice-steps";
import { toggleSelection } from "./practice-log";

export type QuickLogMode = "practice" | "baseline";

export interface QuickLogState {
  open: boolean;
  mode: QuickLogMode;
  step: number;
  query: string;
  selected: number[];
  practicedOn: string;
  confidence: PracticeConfidence;
  note: string;
}

export type QuickLogAction =
  | { type: "toggle-open" }
  | { type: "set-mode"; mode: QuickLogMode }
  | { type: "set-step"; step: number }
  | { type: "select-all"; ids: number[] }
  | { type: "clear-selection" }
  | { type: "set-query"; query: string }
  | { type: "toggle-dance"; id: number }
  | { type: "set-date"; practicedOn: string }
  | { type: "set-confidence"; confidence: PracticeConfidence }
  | { type: "set-note"; note: string }
  | { type: "saved"; today: string };

export const createQuickLogState = (today: string): QuickLogState => ({
  open: false,
  mode: "practice",
  step: DEFAULT_BASELINE_STEP,
  query: "",
  selected: [],
  practicedOn: today,
  confidence: "sure",
  note: "",
});

export function quickLogReducer(state: QuickLogState, action: QuickLogAction): QuickLogState {
  switch (action.type) {
    case "toggle-open":
      return { ...state, open: !state.open };
    case "set-mode":
      return { ...state, mode: action.mode };
    case "set-step":
      return { ...state, step: action.step };
    case "select-all":
      return { ...state, selected: [...new Set([...state.selected, ...action.ids])] };
    case "clear-selection":
      return { ...state, selected: [] };
    case "set-query":
      return { ...state, query: action.query };
    case "toggle-dance":
      return { ...state, selected: toggleSelection(state.selected, action.id) };
    case "set-date":
      return { ...state, practicedOn: action.practicedOn };
    case "set-confidence":
      return { ...state, confidence: action.confidence };
    case "set-note":
      return { ...state, note: action.note };
    case "saved":
      return {
        ...createQuickLogState(action.today),
        open: state.open,
        mode: state.mode,
        step: state.step,
      };
  }
}

export function describeSubmit(mode: QuickLogMode, count: number): string {
  if (mode === "baseline") {
    if (count === 0) return "Set interval step";
    return count === 1 ? "Set step for 1 dance" : `Set step for ${count} dances`;
  }
  if (count === 0) return "Log practice";
  return count === 1 ? "Log 1 dance" : `Log ${count} dances`;
}

const countDances = (count: number): string => (count === 1 ? "1 dance" : `${count} dances`);

export const describeSaved = (mode: QuickLogMode, count: number, step: number): string =>
  mode === "baseline"
    ? `Set ${countDances(count)} to step ${step}`
    : `Logged ${countDances(count)}`;
