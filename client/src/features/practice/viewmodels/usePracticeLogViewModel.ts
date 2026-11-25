import { groupLogByDay } from "../model/practice-log";
import { useDeletePracticeEntryMutation, usePracticeLogQuery } from "./usePracticeQueries";

/** The practice log grouped by day, loaded page by page, with deletion of wrong entries. */
export const usePracticeLogViewModel = (query = "") => {
  const log = usePracticeLogQuery(query);
  const deletion = useDeletePracticeEntryMutation();

  const removeEntry = async (id: number) => {
    try {
      await deletion.mutateAsync(id);
    } catch {
      // The failure is shown through `error`.
    }
  };

  const loadMore = () => {
    if (log.hasNextPage && !log.isFetchingNextPage) void log.fetchNextPage();
  };

  const entries = log.data?.pages.flatMap((page) => page.data) ?? [];
  let error: string | null = null;
  if (log.isError) error = "Failed to load your practice log";
  else if (deletion.isError) error = "Failed to delete the practice entry";

  return {
    state: {
      days: groupLogByDay(entries),
      isFiltered: query.trim() !== "",
      isLoading: log.isPending,
      hasMore: log.hasNextPage,
      isLoadingMore: log.isFetchingNextPage,
      error,
    },
    actions: { removeEntry, loadMore },
  };
};

export type PracticeLogViewModel = ReturnType<typeof usePracticeLogViewModel>;
