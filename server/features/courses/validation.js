function normalizeCourseId(value) {
  return value === null || value === undefined || value === ''
    ? null
    : Number.parseInt(String(value), 10);
}

function normalizeCourseName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateNewCourse(input) {
  const { dance_group_id, course_id, name } = input;
  const courseId = normalizeCourseId(course_id);
  const courseName = normalizeCourseName(name);
  if (!dance_group_id) return { error: 'group_required' };
  if (courseId === null && !courseName) return { error: 'course_identity_required' };
  return { value: normalizeCourse(input, courseId, courseName) };
}

export function validateCourseUpdate(input, existing) {
  const courseId =
    input.course_id === undefined ? existing.course_id : normalizeCourseId(input.course_id);
  const courseName = input.name === undefined ? existing.name : normalizeCourseName(input.name);
  if (courseId === null && !courseName) return { error: 'course_identity_required' };
  return { value: normalizeCourse(input, courseId, courseName) };
}

function normalizeCourse(input, courseId, courseName) {
  return {
    course_id: courseId,
    name: courseName || null,
    dance_group_id: input.dance_group_id,
    semester: input.semester || '',
    start_date: input.start_date || null,
    youtube_playlist_url: input.youtube_playlist_url || null,
    copperknob_list_url: input.copperknob_list_url || null,
    spotify_playlist_url: input.spotify_playlist_url || null,
    trainer_id: input.trainer_id ? Number.parseInt(String(input.trainer_id), 10) : null,
  };
}

export function hasTrainerId(value) {
  return value !== null && value !== undefined && value !== '';
}
