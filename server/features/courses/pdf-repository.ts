import { allQuery, getQuery } from '../../scripts/db.ts';
import type { CoursePdf, CoursePdfId } from './pdf-operations.ts';

const dbName = 'danceGroups' as const;

export async function findCourseForPdf(id: CoursePdfId): Promise<CoursePdf | undefined> {
  return getQuery<CoursePdf>(
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

export async function listSessionsForPdf(
  courseId: CoursePdfId,
): Promise<{ session_date: string }[]> {
  return allQuery<{ session_date: string }>(
    'SELECT session_date FROM sessions WHERE dance_course_id = ? ORDER BY session_date ASC',
    [courseId],
    dbName,
  );
}
