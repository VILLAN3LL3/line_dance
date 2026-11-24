import type { PracticeConfidence } from "../../../types";
import { toggleSelection } from "./practice-log";

export interface QuickLogState {
  open: boolean;
  query: string;
  selected: number[];
  practicedOn: string;
  confidence: PracticeConfidence;
  note: string;
}

export type QuickLogAction =
  | { type: "toggle-open" }
  | { type: "set-query"; query: string }
  | { type: "toggle-dance"; id: number }
  | { type: "set-date"; practicedOn: string }
  | { type: "set-confidence"; confidence: PracticeConfidence }
  | { type: "set-note"; note: string }
  | { type: "saved"; today: string };

export const createQuickLogState = (today: string): QuickLogState => ({
  open: false,
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
      return { ...createQuickLogState(action.today), open: state.open };
  }
}

export function describeSubmit(count: number): string {
  if (count === 0) return "Log practice";
  return count === 1 ? "Log 1 dance" : `Log ${count} dances`;
}
