import type { FieldIssue } from "../../../shared/http/apiErrors";
import type { DanceCourse } from "../../../types";

export type CourseFieldErrors = Partial<Record<"courseId" | "name", string>>;

export function mapCourseFieldIssues(issues: FieldIssue[]): {
  fieldErrors: CourseFieldErrors;
  hasUnmappedIssue: boolean;
} {
  const fieldErrors: CourseFieldErrors = {};
  let hasUnmappedIssue = false;
  for (const issue of issues) {
    if (issue.field === "course_id" && issue.key === "duplicate") {
      fieldErrors.courseId = "This course ID is already in use.";
    } else if (issue.field === "name" && issue.key === "duplicate") {
      fieldErrors.name = "A course without an ID already has this name in this group and semester.";
    } else {
      hasUnmappedIssue = true;
    }
  }
  return { fieldErrors, hasUnmappedIssue };
}

export interface CourseFormValues {
  courseId: string;
  name: string;
  semester: string;
  startDate: string;
  youtubePlaylistUrl: string;
  copperknobListUrl: string;
  spotifyPlaylistUrl: string;
  trainerId: string;
}

export const emptyCourseForm: CourseFormValues = {
  courseId: "",
  name: "",
  semester: "",
  startDate: "",
  youtubePlaylistUrl: "",
  copperknobListUrl: "",
  spotifyPlaylistUrl: "",
  trainerId: "",
};

export function parseCourseFormRoute(groupId?: string, courseId?: string) {
  const parsedGroupId = Number(groupId);
  const parsedCourseId = courseId ? Number(courseId) : null;
  let error: string | null = null;
  if (Number.isNaN(parsedGroupId)) {
    error = "Invalid dance group id";
  } else if (courseId && Number.isNaN(Number(courseId))) {
    error = "Invalid course id";
  }
  return {
    groupId: parsedGroupId,
    courseId: parsedCourseId,
    isEditMode: parsedCourseId !== null && Number.isFinite(parsedCourseId),
    error,
  };
}

export const toCourseFormValues = (course: DanceCourse): CourseFormValues => ({
  courseId:
    course.course_id === null || course.course_id === undefined ? "" : String(course.course_id),
  name: course.name ?? "",
  semester: course.semester ?? "",
  startDate: course.start_date ?? "",
  youtubePlaylistUrl: course.youtube_playlist_url ?? "",
  copperknobListUrl: course.copperknob_list_url ?? "",
  spotifyPlaylistUrl: course.spotify_playlist_url ?? "",
  trainerId: course.trainer_id ? String(course.trainer_id) : "",
});

export const hasCourseIdentifier = (values: CourseFormValues): boolean =>
  Boolean(values.courseId.trim() || values.name.trim());

const parseOptionalInt = (value: string): number | undefined =>
  value ? Number.parseInt(value, 10) : undefined;

/** Payload shared by create and update; empty inputs become `undefined`. */
export const toCoursePayload = (values: CourseFormValues) => ({
  name: values.name.trim() || undefined,
  startDate: values.startDate || undefined,
  youtubePlaylistUrl: values.youtubePlaylistUrl || undefined,
  copperknobListUrl: values.copperknobListUrl || undefined,
  spotifyPlaylistUrl: values.spotifyPlaylistUrl || undefined,
  trainerId: parseOptionalInt(values.trainerId),
  courseId: parseOptionalInt(values.courseId),
});

export const toCreateCoursePayload = (values: CourseFormValues, danceGroupId: number) => ({
  ...toCoursePayload(values),
  danceGroupId,
  semester: values.semester,
});

export const toUpdateCoursePayload = (values: CourseFormValues) => ({
  ...toCoursePayload(values),
  semester: values.semester || undefined,
});
