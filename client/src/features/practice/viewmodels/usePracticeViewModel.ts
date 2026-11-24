import { usePracticeDeckViewModel } from "./usePracticeDeckViewModel";
import { usePracticeLogViewModel } from "./usePracticeLogViewModel";
import { useQuickLogViewModel } from "./useQuickLogViewModel";

/** Everything the practice area of the personal page needs, composed from smaller view models. */
export const usePracticeViewModel = () => ({
  deck: usePracticeDeckViewModel(),
  quickLog: useQuickLogViewModel(),
  log: usePracticeLogViewModel(),
});

export type PracticeViewModel = ReturnType<typeof usePracticeViewModel>;
