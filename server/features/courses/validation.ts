import { z } from 'zod';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
const json: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.custom<number>((value) => typeof value === 'number'),
    z.string(),
    z.array(json),
    z.record(z.string(), json),
  ]),
);
const fields = z.object({
  dance_group_id: json.optional(),
  course_id: json.optional(),
  name: json.optional(),
  semester: json.optional(),
  start_date: json.optional(),
  youtube_playlist_url: json.optional(),
  copperknob_list_url: json.optional(),
  spotify_playlist_url: json.optional(),
  trainer_id: json.optional(),
});
const courseInput = fields.brand<'CourseInput'>();
const query = z.object({ dance_group_id: json.optional() });
const stringConversion = z.preprocess(String, z.string());

export type CourseInput = z.output<typeof courseInput>;
export type CourseIdentity = { course_id: number | null; name: string | null };
export type CourseValues = {
  course_id: number | null;
  name: string | null;
  dance_group_id: JsonValue | undefined;
  semester: JsonValue;
  start_date: JsonValue;
  youtube_playlist_url: JsonValue;
  copperknob_list_url: JsonValue;
  spotify_playlist_url: JsonValue;
  trainer_id: number | null;
};
export type CourseValidationResult =
  { error: 'group_required' | 'course_identity_required' } | { value: CourseValues };
export type CourseUpdateResult = { error: 'course_identity_required' } | { value: CourseValues };
export type NewCourse = { input: CourseInput; validation: CourseValidationResult };

export function prepareCourseInput(input: unknown): CourseInput {
  if (input === null || input === undefined) throw new TypeError('Course input is missing');
  return courseInput.parse(typeof input === 'object' && !Array.isArray(input) ? input : {});
}

export function prepareCourseFilter(input: unknown): { value: JsonValue | undefined } {
  return { value: query.parse(input).dance_group_id };
}

export function prepareNewCourse(input: unknown): NewCourse {
  const parsed = prepareCourseInput(input);
  return { input: parsed, validation: validateNewCourse(parsed) };
}

function normalizeCourseId(value: JsonValue | undefined): number | null {
  return value === null || value === undefined || value === ''
    ? null
    : Number.parseInt(stringConversion.parse(value), 10);
}

function normalizeCourseName(value: JsonValue | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateNewCourse(input: CourseInput): CourseValidationResult {
  const { dance_group_id, course_id, name } = input;
  const courseId = normalizeCourseId(course_id);
  const courseName = normalizeCourseName(name);
  if (!dance_group_id) return { error: 'group_required' };
  if (courseId === null && !courseName) return { error: 'course_identity_required' };
  return { value: normalizeCourse(input, courseId, courseName) };
}

export function validateCourseUpdate(
  input: CourseInput,
  existing: CourseIdentity,
): CourseUpdateResult {
  const courseId =
    input.course_id === undefined ? existing.course_id : normalizeCourseId(input.course_id);
  const courseName = input.name === undefined ? existing.name : normalizeCourseName(input.name);
  if (courseId === null && !courseName) return { error: 'course_identity_required' };
  return { value: normalizeCourse(input, courseId, courseName) };
}

function normalizeCourse(
  input: CourseInput,
  courseId: number | null,
  courseName: string | null,
): CourseValues {
  return {
    course_id: courseId,
    name: courseName || null,
    dance_group_id: input.dance_group_id,
    semester: input.semester || '',
    start_date: input.start_date || null,
    youtube_playlist_url: input.youtube_playlist_url || null,
    copperknob_list_url: input.copperknob_list_url || null,
    spotify_playlist_url: input.spotify_playlist_url || null,
    trainer_id: input.trainer_id
      ? Number.parseInt(stringConversion.parse(input.trainer_id), 10)
      : null,
  };
}

export function hasTrainerId(value: JsonValue | undefined): boolean {
  return value !== null && value !== undefined && value !== '';
}
