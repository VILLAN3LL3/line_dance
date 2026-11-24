import { allQuery } from '../../scripts/db.ts';
import type {
  ParticipantPdfAssignment,
  ParticipantPdfDanceRecord,
  ParticipantPdfSession,
} from './participant-pdf-operations.ts';

const dbName = 'danceGroups' as const;

export async function listSessionsWithIdForPdf(courseId: number): Promise<ParticipantPdfSession[]> {
  return allQuery<ParticipantPdfSession>(
    'SELECT id, session_date FROM sessions WHERE dance_course_id = ? ORDER BY session_date ASC, id ASC',
    [courseId],
    dbName,
  );
}

/** Only dances learned in the session; repetitions are not listed. */
export async function listNewAssignmentsForPdf(
  courseId: number,
): Promise<ParticipantPdfAssignment[]> {
  return allQuery<ParticipantPdfAssignment>(
    `SELECT sc.session_id, sc.choreography_id
     FROM session_choreographies sc
     JOIN sessions s ON s.id = sc.session_id
     WHERE s.dance_course_id = ? AND sc.is_new = 1
     ORDER BY s.session_date ASC, s.id ASC, sc.id ASC`,
    [courseId],
    dbName,
  );
}

function placeholders(ids: number[]): string {
  return ids.map(() => '?').join(',');
}

/** Catalog data with the official level (not the personal one). */
export async function listDancesForPdf(ids: number[]): Promise<ParticipantPdfDanceRecord[]> {
  if (ids.length === 0) return [];
  return allQuery<ParticipantPdfDanceRecord>(
    `SELECT c.id, c.name, l.name AS level, c.count, c.wall_count, c.step_sheet_link, c.demo_video_url
     FROM choreographies c
     LEFT JOIN levels l ON l.id = c.level_id
     WHERE c.id IN (${placeholders(ids)})`,
    ids,
  );
}

export async function listAuthorsForPdf(
  ids: number[],
): Promise<{ choreography_id: number; name: string }[]> {
  if (ids.length === 0) return [];
  return allQuery<{ choreography_id: number; name: string }>(
    `SELECT ca.choreography_id, a.name
     FROM choreography_authors ca
     INNER JOIN authors a ON a.id = ca.author_id
     WHERE ca.choreography_id IN (${placeholders(ids)})
     ORDER BY LOWER(a.name) ASC`,
    ids,
  );
}

export async function listFigureNamesForPdf(ids: number[]): Promise<{ name: string }[]> {
  if (ids.length === 0) return [];
  return allQuery<{ name: string }>(
    `SELECT DISTINCT sf.name
     FROM choreography_step_figures csf
     INNER JOIN step_figures sf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id IN (${placeholders(ids)})`,
    ids,
  );
}
