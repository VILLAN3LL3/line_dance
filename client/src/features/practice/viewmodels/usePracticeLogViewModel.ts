import { groupLogByDay } from "../model/practice-log";
import { useDeletePracticeEntryMutation, usePracticeLogQuery } from "./usePracticeQueries";

/** The practice log grouped by day, with deletion of wrong entries. */
export const usePracticeLogViewModel = () => {
  const log = usePracticeLogQuery();
  const deletion = useDeletePracticeEntryMutation();

  const removeEntry = async (id: number) => {
    try {
      await deletion.mutateAsync(id);
    } catch {
      // The failure is shown through `error`.
    }
  };

  return {
    state: {
      days: groupLogByDay(log.data ?? []),
      count: log.data?.length ?? null,
      isLoading: log.isPending,
      error: log.isError
        ? "Failed to load your practice log"
        : deletion.isError
          ? "Failed to delete the practice entry"
          : null,
    },
    actions: { removeEntry },
  };
};

export type PracticeLogViewModel = ReturnType<typeof usePracticeLogViewModel>;
