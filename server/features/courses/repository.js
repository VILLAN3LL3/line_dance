import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.js';

const dbName = 'danceGroups';
const courseSelect = `SELECT dc.id, dc.course_id, dc.name, dc.dance_group_id,
  NULLIF(dc.semester, '') as semester, dc.start_date, dc.youtube_playlist_url,
  dc.copperknob_list_url, dc.spotify_playlist_url, dc.trainer_id, dc.created_at,
  dg.name as dance_group_name, t.name as trainer_name, t.phone as trainer_phone,
  t.email as trainer_email
  FROM dance_courses dc
  LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
  LEFT JOIN trainers t ON dc.trainer_id = t.id`;

export function withCourseTransaction(action) {
  return withTransaction(dbName, action);
}

export function listCourses(groupId) {
  const filter = groupId ? ' WHERE dc.dance_group_id = ?' : '';
  return allQuery(
    `${courseSelect}${filter} ORDER BY CASE WHEN dc.start_date IS NULL THEN 1 ELSE 0 END, dc.start_date ASC, dc.id ASC`,
    groupId ? [groupId] : [],
    dbName,
  );
}

export function findCourse(id) {
  return getQuery(`${courseSelect} WHERE dc.id = ?`, [id], dbName);
}

export function findCourseIdentity(id) {
  return getQuery('SELECT id, course_id, name FROM dance_courses WHERE id = ?', [id], dbName);
}

export function findGroup(id) {
  return getQuery('SELECT id FROM dance_groups WHERE id = ?', [id], dbName);
}

export function findTrainer(id) {
  return getQuery('SELECT id FROM trainers WHERE id = ?', [id], dbName);
}

function courseValues(course) {
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

export async function insertCourse(course) {
  try {
    const result = await runQuery(
      `INSERT INTO dance_courses (course_id, name, semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url, trainer_id, dance_group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...courseValues(course), course.dance_group_id],
      dbName,
    );
    return { id: result.id };
  } catch (error) {
    if (
      error?.code === 'SQLITE_CONSTRAINT' &&
      error.message?.includes('UNIQUE constraint failed: dance_courses.course_id')
    ) {
      return { error: 'duplicate_course' };
    }
    throw error;
  }
}

export function saveCourse(id, course) {
  return runQuery(
    `UPDATE dance_courses SET course_id = ?, name = ?, semester = ?, start_date = ?, youtube_playlist_url = ?, copperknob_list_url = ?, spotify_playlist_url = ?, trainer_id = ? WHERE id = ?`,
    [...courseValues(course), id],
    dbName,
  );
}

export async function deleteCourse(id) {
  const result = await runQuery('DELETE FROM dance_courses WHERE id = ?', [id], dbName);
  return result.changes > 0;
}
