import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { JsonValue } from '../../utils/json-input.ts';
import type { NewSession, SessionUpdate } from './validation.ts';
import type { SessionChoreography } from './content-repository.ts';

export type Session = {
  id: number;
  dance_course_id: number;
  session_date: string;
  comment: string | null;
  created_at: string | null;
  semester: string | null;
  dance_group_name: string | null;
};
export type AssignmentRow = SessionChoreography & { repetition_number: number };

const dbName = 'danceGroups' as const;
const sessionSelect = `SELECT s.id, s.dance_course_id, s.session_date, s.comment, s.created_at,
  NULLIF(dc.semester, '') as semester, dg.name as dance_group_name
  FROM sessions s
  LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
  LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id`;

export async function withSessionTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction(dbName, action);
}

export async function listSessions(courseId: JsonValue | undefined): Promise<Session[]> {
  const filter = courseId ? ' WHERE s.dance_course_id = ?' : '';
  return allQuery<Session>(
    `${sessionSelect}${filter} ORDER BY CASE WHEN s.session_date IS NULL THEN 1 ELSE 0 END, s.session_date ASC, s.id ASC`,
    courseId ? [courseId] : [],
    dbName,
  );
}

export async function findSession(id: JsonValue): Promise<Session | undefined> {
  return getQuery<Session>(`${sessionSelect} WHERE s.id = ?`, [id], dbName);
}

export async function findCourse(id: JsonValue): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM dance_courses WHERE id = ?', [id], dbName);
}

export async function listGroupSessionDates(
  courseId: JsonValue,
  excludeSessionId: string | number | null,
): Promise<{ dance_course_id: number; session_date: string }[]> {
  return allQuery(
    `SELECT s.dance_course_id, s.session_date FROM sessions s
     JOIN dance_courses c ON c.id = s.dance_course_id
     WHERE c.dance_group_id = (SELECT dance_group_id FROM dance_courses WHERE id = ?)
       AND (? IS NULL OR s.id != ?)`,
    [courseId, excludeSessionId, excludeSessionId],
    dbName,
  );
}

export async function insertSession({
  dance_course_id,
  session_date,
  comment,
}: NewSession): Promise<WriteResult> {
  return runQuery(
    'INSERT INTO sessions (dance_course_id, session_date, comment) VALUES (?, ?, ?)',
    [dance_course_id, session_date, comment],
    dbName,
  );
}

export async function saveSession(
  id: JsonValue,
  { session_date, comment }: SessionUpdate,
): Promise<WriteResult> {
  return runQuery(
    'UPDATE sessions SET session_date = ?, comment = ? WHERE id = ?',
    [session_date, comment, id],
    dbName,
  );
}

export async function deleteSession(id: JsonValue): Promise<boolean> {
  const result = await runQuery('DELETE FROM sessions WHERE id = ?', [id], dbName);
  return result.changes > 0;
}

export async function listAssignments(sessionId: JsonValue): Promise<AssignmentRow[]> {
  return allQuery<AssignmentRow>(
    `SELECT sc.*, CASE WHEN sc.is_new = 1 THEN 0 ELSE 1 + (
       SELECT COUNT(*) FROM session_choreographies previous
       JOIN sessions previous_session ON previous_session.id = previous.session_id
       WHERE previous.choreography_id = sc.choreography_id AND previous.is_new = 0
         AND previous_session.dance_course_id = current_session.dance_course_id
         AND (previous_session.session_date < current_session.session_date
           OR (previous_session.session_date = current_session.session_date
             AND previous_session.id < current_session.id))
     ) END AS repetition_number
     FROM session_choreographies sc
     JOIN sessions current_session ON current_session.id = sc.session_id
     WHERE sc.session_id = ?
     ORDER BY sc.created_at DESC`,
    [sessionId],
    dbName,
  );
}

export async function findAssignment(id: number): Promise<AssignmentRow | undefined> {
  return getQuery<AssignmentRow>(
    'SELECT *, 0 AS repetition_number FROM session_choreographies WHERE id = ?',
    [id],
    dbName,
  );
}

export async function insertAssignment(
  sessionId: JsonValue,
  choreographyId: JsonValue,
): Promise<{ id: number } | { error: 'duplicate_assignment' }> {
  try {
    const result = await runQuery(
      `INSERT INTO session_choreographies (session_id, choreography_id, is_new, auto_repeat)
       VALUES (?, ?, 1, 1)`,
      [sessionId, choreographyId],
      dbName,
    );
    return { id: result.id };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'SQLITE_CONSTRAINT' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes(
        'UNIQUE constraint failed: session_choreographies.session_id, session_choreographies.choreography_id',
      )
    ) {
      return { error: 'duplicate_assignment' };
    }
    throw error;
  }
}

export async function updateAssignmentSong(id: number, songId: number | null): Promise<void> {
  await runQuery(
    'UPDATE session_choreographies SET song_id = ? WHERE id = ? OR repeat_source_id = ?',
    [songId, id, id],
    dbName,
  );
}

export async function deleteAssignment(id: JsonValue): Promise<boolean> {
  const result = await runQuery(
    'DELETE FROM session_choreographies WHERE id = ? OR repeat_source_id = ?',
    [id, id],
    dbName,
  );
  return result.changes > 0;
}
