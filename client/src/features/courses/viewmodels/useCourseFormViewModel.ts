import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useDanceGroupQuery } from "../../dance-groups";
import { useTrainersQuery } from "../../trainers";
import { useUrlCheck } from "../../url-check";
import { createDanceCourse, updateDanceCourse } from "../api";
import {
  emptyCourseForm,
  hasCourseIdentifier,
  parseCourseFormRoute,
  toCourseFormValues,
  toCreateCoursePayload,
  toUpdateCoursePayload,
  type CourseFormValues,
} from "../model/course-form";
import { courseKeys } from "../queryKeys";
import { useCoursesQuery } from "./useCourseQueries";

/** ViewModel for creating and editing a course. */
export const useCourseFormViewModel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ groupId: string; courseId?: string }>();
  const route = parseCourseFormRoute(params.groupId, params.courseId);
  const enabled = route.error === null;

  const groupQuery = useDanceGroupQuery(route.groupId, enabled);
  const trainersQuery = useTrainersQuery();
  const coursesQuery = useCoursesQuery(route.groupId, enabled);
  const youtubeUrlCheck = useUrlCheck();
  const copperknobUrlCheck = useUrlCheck();
  const spotifyUrlCheck = useUrlCheck();

  const existingCourse =
    route.isEditMode && coursesQuery.data
      ? (coursesQuery.data.find((item) => item.id === route.courseId) ?? null)
      : null;

  // The form shows the loaded course until the user edits a field.
  const [draft, setDraft] = useState<CourseFormValues | null>(null);
  const values = draft ?? (existingCourse ? toCourseFormValues(existingCourse) : emptyCourseForm);
  const [actionError, setActionError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (formValues: CourseFormValues) => {
      if (route.isEditMode && route.courseId !== null) {
        await updateDanceCourse(route.courseId, toUpdateCoursePayload(formValues));
        return;
      }
      await createDanceCourse(toCreateCoursePayload(formValues, route.groupId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  });

  const loadFailed = groupQuery.isError || trainersQuery.isError || coursesQuery.isError;
  useEffect(() => {
    const failure = groupQuery.error ?? trainersQuery.error ?? coursesQuery.error;
    if (failure) console.error(failure);
  }, [groupQuery.error, trainersQuery.error, coursesQuery.error]);

  let loadError: string | null = null;
  if (loadFailed) {
    loadError = "Failed to load course form data";
  } else if (route.isEditMode && coursesQuery.isSuccess && !existingCourse) {
    loadError = "Course not found";
  }

  const isLoading =
    groupQuery.isFetching ||
    trainersQuery.isFetching ||
    coursesQuery.isFetching ||
    saveMutation.isPending;

  const goBackToGroup = () => void navigate(`/admin/groups/${route.groupId}`);

  const submit = async () => {
    if (!hasCourseIdentifier(values)) {
      setActionError("Course ID or name is required");
      return;
    }

    setActionError(null);
    try {
      await saveMutation.mutateAsync(values);
      goBackToGroup();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save course");
      console.error(err);
    }
  };

  return {
    state: {
      title: route.isEditMode ? "Edit Course" : "Create Course",
      isEditMode: route.isEditMode,
      group: groupQuery.data ?? null,
      existingCourse,
      urlChecks: {
        youtube: youtubeUrlCheck,
        copperknob: copperknobUrlCheck,
        spotify: spotifyUrlCheck,
      },
      trainers: trainersQuery.data ?? [],
      values,
      isLoading,
      routeError: route.error,
      error: actionError ?? loadError,
    },
    actions: {
      changeValues: (patch: Partial<CourseFormValues>) => setDraft({ ...values, ...patch }),
      submit,
      goBackToGroup,
    },
  };
};
