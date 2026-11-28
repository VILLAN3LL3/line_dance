import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { DanceCourse } from "../../../types";
import { useAllChoreographiesQuery } from "../../choreographies";
import {
  useAllSessionsQuery,
  useCoursesQuery,
  useDeleteCourseMutation,
  useExportCoursePdfMutation,
  useExportParticipantPdfMutation,
} from "../../courses";
import { useGenresQuery, useLevelsQuery } from "../../metadata";
import { useStepFiguresWithIdsQuery } from "../../step-figures";
import { updateGroupBaseStepFigures, updateGroupMaxLevel } from "../api";
import { groupSessionsByCourseId } from "../model/learned-step-figures";
import { danceGroupKeys } from "../queryKeys";
import { useDanceGroupQuery } from "./useDanceGroupQueries";
import {
  useBaseStepFiguresQuery,
  useLearnedChoreographiesQuery,
  useMaxLevelQuery,
  useStepFigureSuggestionsQuery,
} from "./useGroupDetailQueries";

const messageOr = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/** ViewModel for the dance group page: courses, max level, learned figures and suggestions. */
export const useDanceGroupDetailViewModel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { groupId } = useParams<{ groupId: string }>();
  const parsedGroupId = Number(groupId);
  const routeError = Number.isFinite(parsedGroupId) ? null : "Invalid dance group id";
  const enabled = routeError === null;

  const groupQuery = useDanceGroupQuery(parsedGroupId, enabled);
  const coursesQuery = useCoursesQuery(parsedGroupId, enabled);
  const sessionsQuery = useAllSessionsQuery(enabled);
  const learnedQuery = useLearnedChoreographiesQuery(parsedGroupId, enabled);
  const choreographiesQuery = useAllChoreographiesQuery(enabled);
  const maxLevelQuery = useMaxLevelQuery(parsedGroupId, enabled);
  const levelsQuery = useLevelsQuery();
  const genresQuery = useGenresQuery();
  const baseFiguresQuery = useBaseStepFiguresQuery(parsedGroupId, enabled);
  const allFiguresQuery = useStepFiguresWithIdsQuery();
  const [suggestionMusic, setSuggestionMusic] = useState<{
    minBpm: number | null;
    maxBpm: number | null;
    genres: string[];
  }>({ minBpm: null, maxBpm: null, genres: [] });
  const suggestionsQuery = useStepFigureSuggestionsQuery(
    parsedGroupId,
    maxLevelQuery.data?.max_group_level_value ?? null,
    enabled && maxLevelQuery.isSuccess,
    suggestionMusic,
  );

  const deleteCourse = useDeleteCourseMutation();
  const exportPdf = useExportCoursePdfMutation();
  const exportParticipantPdf = useExportParticipantPdfMutation();
  const maxLevelMutation = useMutation({
    mutationFn: (value: number | null) => updateGroupMaxLevel(parsedGroupId, value),
    onSuccess: (updated) =>
      queryClient.setQueryData(danceGroupKeys.maxLevel(parsedGroupId), updated),
  });
  const baseFiguresMutation = useMutation({
    mutationFn: (stepFigureIds: number[]) =>
      updateGroupBaseStepFigures(parsedGroupId, stepFigureIds),
    onSuccess: (updated) =>
      queryClient.setQueryData(danceGroupKeys.baseStepFigures(parsedGroupId), updated),
  });

  const [actionError, setActionError] = useState<string | null>(null);

  const queries = [
    groupQuery,
    coursesQuery,
    sessionsQuery,
    learnedQuery,
    choreographiesQuery,
    maxLevelQuery,
    levelsQuery,
    baseFiguresQuery,
    allFiguresQuery,
    genresQuery,
    suggestionsQuery,
  ];
  const loadFailure = queries.find((query) => query.isError)?.error;
  useEffect(() => {
    if (loadFailure) console.error(loadFailure);
  }, [loadFailure]);

  const isLoading =
    queries.some((query) => query.isFetching) ||
    deleteCourse.isPending ||
    exportPdf.isPending ||
    exportParticipantPdf.isPending ||
    maxLevelMutation.isPending;

  const run = async (action: () => Promise<unknown>, failure: string, useServerMessage = true) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(useServerMessage ? messageOr(err, failure) : failure);
      console.error(err);
    }
  };

  return {
    state: {
      groupId: parsedGroupId,
      groupName: groupQuery.data?.name ?? null,
      error: routeError ?? actionError ?? (loadFailure ? "Failed to load group data" : null),
      isLoading,
      courses: coursesQuery.data ?? [],
      sessionsByCourseId: groupSessionsByCourseId(sessionsQuery.data ?? []),
      learnedChoreographies: learnedQuery.data ?? [],
      choreographies: choreographiesQuery.data ?? [],
      stepFigureSuggestions: suggestionsQuery.data ?? [],
      maxGroupLevelValue: maxLevelQuery.data?.max_group_level_value ?? null,
      levelOptions: levelsQuery.data ?? [],
      genreOptions: genresQuery.data ?? [],
      suggestionMusic,
      baseStepFigures: baseFiguresQuery.data ?? [],
      allStepFigures: allFiguresQuery.data ?? [],
    },
    actions: {
      backToGroups: () => void navigate("/admin"),
      deleteCourse: (courseId: number) =>
        run(() => deleteCourse.mutateAsync(courseId), "Failed to delete course", false),
      exportCoursePdf: (course: DanceCourse) =>
        run(() => exportPdf.mutateAsync(course), "PDF-Export fehlgeschlagen"),
      exportParticipantPdf: (course: DanceCourse) =>
        run(() => exportParticipantPdf.mutateAsync(course), "PDF-Export fehlgeschlagen"),
      changeMaxGroupLevel: (value: number | null) =>
        run(() => maxLevelMutation.mutateAsync(value), "Failed to update max group level"),
      changeBaseStepFigures: (stepFigureIds: number[]) =>
        run(
          () => baseFiguresMutation.mutateAsync(stepFigureIds),
          "Failed to update base step figures",
        ),
      changeSuggestionMusic: (music: {
        minBpm: number | null;
        maxBpm: number | null;
        genres: string[];
      }) => setSuggestionMusic(music),
    },
  };
};
