import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { openInNewTab } from "../../../shared/browser/window";
import { useAllChoreographiesQuery, useDeleteChoreographyMutation } from "../../choreographies";
import {
  filterVisibleSessions,
  formatCourseHeader,
  getChoreographyOptionLabel,
  getSelectableChoreographies,
  parseCourseDetailRoute,
} from "../model/course-detail";
import { getBerlinTodayIso } from "../model/course-status";
import {
  useCoursesQuery,
  useSessionChoreographiesQuery,
  useSessionsQuery,
} from "./useCourseQueries";
import { useChoreographyPicker } from "./useChoreographyPicker";
import { useSessionForms } from "./useSessionForms";
import { useSessionMutations } from "./useSessionMutations";
import { useSessionSuggestions } from "./useSessionSuggestions";

const messageOr = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/** ViewModel for the course detail page: sessions, their choreographies and suggestion helpers. */
export const useCourseDetailViewModel = () => {
  const navigate = useNavigate();
  const params = useParams<{ groupId: string; courseId: string }>();
  const route = parseCourseDetailRoute(params.groupId, params.courseId);
  const routeEnabled = route.error === null;

  const coursesQuery = useCoursesQuery(route.groupId, routeEnabled);
  const sessionsQuery = useSessionsQuery(route.courseId, routeEnabled);
  const choreographiesQuery = useAllChoreographiesQuery(routeEnabled);
  const mutations = useSessionMutations(route.courseId);
  const deleteChoreography = useDeleteChoreographyMutation();

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showPassedSessions, setShowPassedSessions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const course = coursesQuery.data?.find((item) => item.id === route.courseId) ?? null;
  const sessions = sessionsQuery.data ?? [];
  const selectedSession = sessions.find((item) => item.id === selectedSessionId) ?? null;
  const sessionChoreographiesQuery = useSessionChoreographiesQuery(selectedSession?.id ?? null);
  const sessionChoreographies = sessionChoreographiesQuery.data ?? [];
  const availableChoreographies = choreographiesQuery.data ?? [];
  const selectableChoreographies = getSelectableChoreographies(
    availableChoreographies,
    sessionChoreographies,
  );

  const forms = useSessionForms();
  const picker = useChoreographyPicker(selectableChoreographies);
  const suggestions = useSessionSuggestions(setActionError);

  const loadFailed = coursesQuery.isError || sessionsQuery.isError || choreographiesQuery.isError;
  useEffect(() => {
    const failure = coursesQuery.error ?? sessionsQuery.error ?? choreographiesQuery.error;
    if (failure) console.error(failure);
  }, [coursesQuery.error, sessionsQuery.error, choreographiesQuery.error]);

  let loadError: string | null = null;
  if (loadFailed) {
    loadError = "Failed to load course data";
  } else if (coursesQuery.isSuccess && !course) {
    loadError = "Course not found";
  } else if (sessionChoreographiesQuery.isError) {
    loadError = "Failed to load session choreographies";
  }
  const error = route.error ?? actionError ?? loadError;

  const isLoading =
    coursesQuery.isFetching ||
    sessionsQuery.isFetching ||
    choreographiesQuery.isFetching ||
    sessionChoreographiesQuery.isFetching ||
    mutations.isPending ||
    deleteChoreography.isPending;

  const berlinTodayIso = getBerlinTodayIso();
  const visibleSessions = filterVisibleSessions(sessions, showPassedSessions, berlinTodayIso);

  const run = async (action: () => Promise<unknown>, failure: string, useServerMessage = true) => {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setActionError(useServerMessage ? messageOr(err, failure) : failure);
      console.error(err);
      return false;
    }
  };

  const clearSelection = () => {
    setSelectedSessionId(null);
    picker.actions.reset();
  };

  const createSession = async () => {
    if (!forms.state.newDate) {
      setActionError("Session date is required");
      return;
    }
    const created = await run(
      () =>
        mutations.create.mutateAsync({
          date: forms.state.newDate,
          comment: forms.state.newComment || undefined,
        }),
      "Failed to create session",
    );
    if (created) forms.actions.resetNewSession();
  };

  const saveEditedSession = async (sessionId: number) => {
    if (!forms.state.editDate) {
      setActionError("Session date is required");
      return;
    }
    const saved = await run(
      () =>
        mutations.update.mutateAsync({
          id: sessionId,
          date: forms.state.editDate,
          comment: forms.state.editComment || null,
        }),
      "Failed to update session",
    );
    if (saved) forms.actions.cancelEdit();
  };

  const deleteSession = async (sessionId: number) => {
    const deleted = await run(
      () => mutations.remove.mutateAsync(sessionId),
      "Failed to delete session",
      false,
    );
    if (deleted && selectedSessionId === sessionId) clearSelection();
  };

  const confirmSwap = async (sessionId: number) => {
    if (!forms.state.swapTargetSessionId) return;
    const swapped = await run(
      () =>
        mutations.swap.mutateAsync({
          sessionId,
          targetId: Number.parseInt(forms.state.swapTargetSessionId, 10),
        }),
      "Failed to swap sessions",
    );
    if (swapped) forms.actions.cancelSwap();
  };

  const reorderContents = async (sessionIds: number[]) => {
    if (isLoading) return;
    const reordered = await run(
      () => mutations.reorder.mutateAsync(sessionIds),
      "Failed to reorder session contents",
    );
    if (reordered) {
      suggestions.actions.clear();
      picker.actions.reset();
    }
  };

  const selectSession = (session: { id: number }) => {
    setActionError(null);
    picker.actions.reset();
    setSelectedSessionId((current) => (current === session.id ? null : session.id));
  };

  const addChoreography = async () => {
    if (!selectedSession || !picker.state.selectedId) {
      setActionError("Please select a choreography");
      return;
    }
    const added = await run(
      () =>
        mutations.addChoreography.mutateAsync({
          sessionId: selectedSession.id,
          choreographyId: Number.parseInt(picker.state.selectedId, 10),
        }),
      "Failed to add choreography",
    );
    if (added) picker.actions.reset();
  };

  const removeChoreography = async (choreographyId: number) => {
    const target = sessionChoreographies.find((item) => item.choreography_id === choreographyId);
    if (!target || !selectedSession) return;
    await run(
      () =>
        mutations.removeChoreography.mutateAsync({
          sessionChoreographyId: target.id,
          sessionId: selectedSession.id,
        }),
      "Failed to remove choreography",
      false,
    );
  };

  const deleteChoreographyEverywhere = async (choreographyId: number) => {
    const deleted = await run(
      () => deleteChoreography.mutateAsync(choreographyId),
      "Failed to delete choreography",
      false,
    );
    if (deleted) await mutations.refreshCourse();
  };

  return {
    state: {
      headerTitle: formatCourseHeader(course),
      groupId: route.groupId,
      error,
      isLoading,
      sessions,
      visibleSessions,
      selectedSessionId,
      berlinTodayIso,
      showPassedSessions,
      forms: forms.state,
      suggestions: suggestions.state,
      picker: picker.state,
      selectableChoreographies,
      sessionChoreographies,
      availableChoreographies,
      getChoreographyOptionLabel,
    },
    actions: {
      goBack: () => void navigate(`/admin/groups/${route.groupId}`),
      toggleShowPassedSessions: setShowPassedSessions,
      forms: forms.actions,
      createSession,
      saveEditedSession,
      deleteSession,
      confirmSwap,
      reorderContents,
      selectSession,
      toggleSuggestions: suggestions.actions.toggle,
      changeChoreographyQuery: picker.actions.changeQuery,
      addChoreography,
      removeChoreography,
      editChoreography: (choreographyId: number) =>
        openInNewTab(`/choreographies/${choreographyId}?edit=1`),
      deleteChoreography: deleteChoreographyEverywhere,
    },
  };
};
