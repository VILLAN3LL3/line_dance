import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';

const dbName = 'danceGroups';
const sessionSelect = `SELECT s.id, s.dance_course_id, s.session_date, s.comment, s.created_at,
  dc.semester, dg.name as dance_group_name
  FROM sessions s
  LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
  LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id`;

export function withSessionTransaction(action) {
  return withTransaction(dbName, action);
}

export function listSessions(courseId) {
  const filter = courseId ? ' WHERE s.dance_course_id = ?' : '';
  return allQuery(
    `${sessionSelect}${filter} ORDER BY CASE WHEN s.session_date IS NULL THEN 1 ELSE 0 END, s.session_date ASC, s.id ASC`,
    courseId ? [courseId] : [],
    dbName,
  );
}

export function findSession(id) {
  return getQuery(`${sessionSelect} WHERE s.id = ?`, [id], dbName);
}

export function findCourse(id) {
  return getQuery('SELECT id FROM dance_courses WHERE id = ?', [id], dbName);
}

export function insertSession({ dance_course_id, session_date, comment }) {
  return runQuery(
    'INSERT INTO sessions (dance_course_id, session_date, comment) VALUES (?, ?, ?)',
    [dance_course_id, session_date, comment],
    dbName,
  );
}

export function saveSession(id, { session_date, comment }) {
  return runQuery(
    'UPDATE sessions SET session_date = ?, comment = ? WHERE id = ?',
    [session_date, comment, id],
    dbName,
  );
}

export async function deleteSession(id) {
  const result = await runQuery('DELETE FROM sessions WHERE id = ?', [id], dbName);
  return result.changes > 0;
}

export function listAssignments(sessionId) {
  return allQuery(
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

export function findAssignment(id) {
  return getQuery(
    'SELECT *, 0 AS repetition_number FROM session_choreographies WHERE id = ?',
    [id],
    dbName,
  );
}

export async function insertAssignment(sessionId, choreographyId) {
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
      error?.code === 'SQLITE_CONSTRAINT' &&
      error.message?.includes(
        'UNIQUE constraint failed: session_choreographies.session_id, session_choreographies.choreography_id',
      )
    ) {
      return { error: 'duplicate_assignment' };
    }
    throw error;
  }
}

export async function deleteAssignment(id) {
  const result = await runQuery(
    'DELETE FROM session_choreographies WHERE id = ? OR repeat_source_id = ?',
    [id, id],
    dbName,
  );
  return result.changes > 0;
}
