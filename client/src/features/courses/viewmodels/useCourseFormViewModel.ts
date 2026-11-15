import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getApiErrorMessage, getFieldIssues } from "../../../shared/http/apiErrors";
import { useDanceGroupQuery } from "../../dance-groups";
import { useTrainersQuery } from "../../trainers";
import { useUrlCheck } from "../../url-check";
import { createDanceCourse, updateDanceCourse } from "../api";
import {
  emptyCourseForm,
  hasCourseIdentifier,
  mapCourseFieldIssues,
  parseCourseFormRoute,
  toCourseFormValues,
  toCreateCoursePayload,
  toUpdateCoursePayload,
  type CourseFormValues,
  type CourseFieldErrors,
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
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});

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
    setFieldErrors({});
    if (!hasCourseIdentifier(values)) {
      setActionError("Course ID or name is required");
      return;
    }

    setActionError(null);
    try {
      await saveMutation.mutateAsync(values);
      goBackToGroup();
    } catch (err) {
      const issues = getFieldIssues(err);
      if (issues) {
        const mapped = mapCourseFieldIssues(issues);
        setFieldErrors(mapped.fieldErrors);
        if (mapped.hasUnmappedIssue) {
          setActionError(getApiErrorMessage(err) ?? "Some fields could not be validated.");
          console.error(err);
        }
      } else {
        setActionError(getApiErrorMessage(err) ?? "Failed to save course. Please try again.");
        console.error(err);
      }
    }
  };

  const changeValues = (patch: Partial<CourseFormValues>) => {
    setDraft({ ...values, ...patch });
    setFieldErrors((previous) => ({
      ...previous,
      ...(patch.courseId !== undefined ? { courseId: undefined } : {}),
      ...(patch.name !== undefined || patch.semester !== undefined || patch.courseId !== undefined
        ? { name: undefined }
        : {}),
    }));
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
      fieldErrors,
      isLoading,
      routeError: route.error,
      error: actionError ?? loadError,
    },
    actions: {
      changeValues,
      submit,
      goBackToGroup,
    },
  };
};
