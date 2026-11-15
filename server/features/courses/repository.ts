import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { CourseIdentity, CourseInput, CourseValues } from './validation.ts';

export type Course = {
  id: number;
  course_id: number | null;
  name: string | null;
  dance_group_id: number;
  semester: string | null;
  start_date: string | null;
  youtube_playlist_url: string | null;
  copperknob_list_url: string | null;
  spotify_playlist_url: string | null;
  trainer_id: number | null;
  created_at: string | null;
  dance_group_name: string | null;
  trainer_name: string | null;
  trainer_phone: string | null;
  trainer_email: string | null;
};

const dbName = 'danceGroups' as const;
const courseSelect = `SELECT dc.id, dc.course_id, dc.name, dc.dance_group_id,
  NULLIF(dc.semester, '') as semester, dc.start_date, dc.youtube_playlist_url,
  dc.copperknob_list_url, dc.spotify_playlist_url, dc.trainer_id, dc.created_at,
  dg.name as dance_group_name, t.name as trainer_name, t.phone as trainer_phone,
  t.email as trainer_email
  FROM dance_courses dc
  LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
  LEFT JOIN trainers t ON dc.trainer_id = t.id`;

export async function withCourseTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction(dbName, action);
}

export async function listCourses(groupId: CourseInput['dance_group_id']): Promise<Course[]> {
  const filter = groupId ? ' WHERE dc.dance_group_id = ?' : '';
  return allQuery<Course>(
    `${courseSelect}${filter} ORDER BY CASE WHEN dc.start_date IS NULL THEN 1 ELSE 0 END, dc.start_date ASC, dc.id ASC`,
    groupId ? [groupId] : [],
    dbName,
  );
}

export async function findCourse(id: string | number): Promise<Course | undefined> {
  return getQuery<Course>(`${courseSelect} WHERE dc.id = ?`, [id], dbName);
}

export async function findCourseIdentity(
  id: string | number,
): Promise<(CourseIdentity & { dance_group_id: number }) | undefined> {
  return getQuery<CourseIdentity & { dance_group_id: number }>(
    'SELECT id, course_id, name, dance_group_id FROM dance_courses WHERE id = ?',
    [id],
    dbName,
  );
}

export async function findNamedCourse(
  groupId: CourseInput['dance_group_id'],
  semester: CourseValues['semester'],
  name: string | null,
  excludeId: string | number | null,
): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>(
    `SELECT id FROM dance_courses
     WHERE dance_group_id = ? AND semester = ? AND course_id IS NULL AND name = ?
       AND (? IS NULL OR id != ?)`,
    [groupId, semester, name, excludeId, excludeId],
    dbName,
  );
}

export async function findGroup(
  id: CourseInput['dance_group_id'],
): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM dance_groups WHERE id = ?', [id], dbName);
}

export async function findTrainer(
  id: CourseInput['trainer_id'],
): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM trainers WHERE id = ?', [id], dbName);
}

function courseValues(course: CourseValues): CourseValues[keyof CourseValues][] {
  return [
    course.course_id,
    course.name,
    course.semester,
    course.start_date,
    course.youtube_playlist_url,
    course.copperknob_list_url,
    course.spotify_playlist_url,
    course.trainer_id,
  ];
}

async function writeCourse(
  action: () => Promise<WriteResult>,
): Promise<WriteResult | { error: 'duplicate_course' }> {
  try {
    return await action();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'SQLITE_CONSTRAINT' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('UNIQUE constraint failed: dance_courses.course_id')
    ) {
      return { error: 'duplicate_course' };
    }
    throw error;
  }
}

export async function insertCourse(
  course: CourseValues,
): Promise<WriteResult | { error: 'duplicate_course' }> {
  return writeCourse(() =>
    runQuery(
      `INSERT INTO dance_courses (course_id, name, semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url, trainer_id, dance_group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...courseValues(course), course.dance_group_id],
      dbName,
    ),
  );
}

export async function saveCourse(
  id: string | number,
  course: CourseValues,
): Promise<WriteResult | { error: 'duplicate_course' }> {
  return writeCourse(() =>
    runQuery(
      `UPDATE dance_courses SET course_id = ?, name = ?, semester = ?, start_date = ?, youtube_playlist_url = ?, copperknob_list_url = ?, spotify_playlist_url = ?, trainer_id = ? WHERE id = ?`,
      [...courseValues(course), id],
      dbName,
    ),
  );
}

export async function deleteCourse(id: string | number): Promise<boolean> {
  const result = await runQuery('DELETE FROM dance_courses WHERE id = ?', [id], dbName);
  return result.changes > 0;
}
