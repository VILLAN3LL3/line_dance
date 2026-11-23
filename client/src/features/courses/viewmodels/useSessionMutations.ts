import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  addChoreographyToSession,
  chooseSessionChoreographySong,
  createSession,
  deleteSession,
  removeChoreographyFromSession,
  reorderSessionContents,
  swapSessions,
  updateSession,
} from "../api";
import { courseKeys } from "../queryKeys";

/** Session write operations; each one refreshes the cached data it affects before resolving. */
export function useSessionMutations(courseId: number) {
  const queryClient = useQueryClient();
  const refreshCourse = () => queryClient.invalidateQueries({ queryKey: courseKeys.all });
  const refreshSessionChoreographies = (sessionId: number) =>
    queryClient.invalidateQueries({ queryKey: courseKeys.sessionChoreographies(sessionId) });

  const create = useMutation({
    mutationFn: (input: { date: string; comment?: string }) =>
      createSession(courseId, input.date, input.comment),
    onSuccess: refreshCourse,
  });
  const update = useMutation({
    mutationFn: (input: { id: number; date: string; comment: string | null }) =>
      updateSession(input.id, input.date, input.comment),
    onSuccess: refreshCourse,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteSession(id),
    onSuccess: refreshCourse,
  });
  const swap = useMutation({
    mutationFn: (input: { sessionId: number; targetId: number }) =>
      swapSessions(input.sessionId, input.targetId),
    onSuccess: refreshCourse,
  });
  const reorder = useMutation({
    mutationFn: (sessionIds: number[]) => reorderSessionContents(sessionIds),
    onSuccess: refreshCourse,
  });
  const addChoreography = useMutation({
    mutationFn: (input: { sessionId: number; choreographyId: number }) =>
      addChoreographyToSession(input.sessionId, input.choreographyId),
    onSuccess: (_data, input) => refreshSessionChoreographies(input.sessionId),
  });
  const removeChoreography = useMutation({
    mutationFn: (input: { sessionChoreographyId: number; sessionId: number }) =>
      removeChoreographyFromSession(input.sessionChoreographyId),
    onSuccess: (_data, input) => refreshSessionChoreographies(input.sessionId),
  });

  const chooseSong = useMutation({
    mutationFn: (input: { sessionChoreographyId: number; songId: number | null }) =>
      chooseSessionChoreographySong(input.sessionChoreographyId, input.songId),
    // The choice is also applied to the automatic repetitions in other sessions.
    onSuccess: refreshCourse,
  });

  const isPending = [
    create,
    update,
    remove,
    swap,
    reorder,
    addChoreography,
    removeChoreography,
    chooseSong,
  ].some((mutation) => mutation.isPending);

  return {
    create,
    update,
    remove,
    swap,
    reorder,
    addChoreography,
    removeChoreography,
    chooseSong,
    isPending,
    refreshCourse,
  };
}
