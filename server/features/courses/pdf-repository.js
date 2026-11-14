import { allQuery, getQuery } from '../../scripts/db.js';

const dbName = 'danceGroups';

export function findCourseForPdf(id) {
  return getQuery(
    `SELECT dc.id, dc.course_id, dc.name, NULLIF(dc.semester, '') as semester, dg.name as dance_group_name, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url,
      t.id as trainer_id, t.name as trainer_name, t.phone as trainer_phone, t.email as trainer_email
     FROM dance_courses dc
     LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
     LEFT JOIN trainers t ON dc.trainer_id = t.id
     WHERE dc.id = ?`,
    [id],
    dbName,
  );
}

export function listSessionsForPdf(courseId) {
  return allQuery(
    'SELECT session_date FROM sessions WHERE dance_course_id = ? ORDER BY session_date ASC',
    [courseId],
    dbName,
  );
}
