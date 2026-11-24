import { usePracticeDeckViewModel } from "./usePracticeDeckViewModel";
import { usePracticeLogViewModel } from "./usePracticeLogViewModel";
import { useQuickLogViewModel } from "./useQuickLogViewModel";

/** Everything the practice area of the personal page needs; `query` filters the dances by name. */
export const usePracticeViewModel = (query = "") => ({
  deck: usePracticeDeckViewModel(query),
  quickLog: useQuickLogViewModel(),
  log: usePracticeLogViewModel(query),
});

export type PracticeViewModel = ReturnType<typeof usePracticeViewModel>;
