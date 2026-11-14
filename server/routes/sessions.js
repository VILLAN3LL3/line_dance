import { runQuery, getQuery, allQuery } from '../scripts/db.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';
import { addSessionChoreography } from './session-repetitions.js';
import { rearrangeSessionContents } from './session-content-flow.js';

const dbName = 'danceGroups';

// Sessions endpoints

export async function getSessions(req, res) {
  try {
    const { dance_course_id } = req.query;

    let query = `SELECT s.id, s.dance_course_id, s.session_date, s.comment, s.created_at, dc.semester, dg.name as dance_group_name
                 FROM sessions s
                 LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
                 LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id`;
    let params = [];

    if (dance_course_id) {
      query += ` WHERE s.dance_course_id = ?`;
      params.push(dance_course_id);
    }

    query += ` ORDER BY CASE WHEN s.session_date IS NULL THEN 1 ELSE 0 END, s.session_date ASC, s.id ASC`;

    const rows = await allQuery(query, params, dbName);
    res.json(rows);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

export async function createSession(req, res) {
  try {
    const { dance_course_id, session_date, comment } = req.body;

    if (!dance_course_id || !session_date) {
      return res.status(400).json({ error: 'Dance course ID and session date are required' });
    }

    // Verify dance course exists
    const course = await getQuery(
      `SELECT id FROM dance_courses WHERE id = ?`,
      [dance_course_id],
      dbName,
    );

    if (!course) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    const result = await runQuery(
      `INSERT INTO sessions (dance_course_id, session_date, comment) VALUES (?, ?, ?)`,
      [dance_course_id, session_date, comment ?? null],
      dbName,
    );

    const session = await getQuery(
      `SELECT s.id, s.dance_course_id, s.session_date, s.comment, s.created_at, dc.semester, dg.name as dance_group_name
       FROM sessions s
       LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE s.id = ?`,
      [result.id],
      dbName,
    );

    res.status(201).json(session);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

export async function updateSession(req, res) {
  try {
    const { id } = req.params;
    const { session_date, comment } = req.body;

    if (!session_date) {
      return res.status(400).json({ error: 'Session date is required' });
    }

    const existing = await getQuery(`SELECT id FROM sessions WHERE id = ?`, [id], dbName);

    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await runQuery(
      `UPDATE sessions SET session_date = ?, comment = ? WHERE id = ?`,
      [session_date, comment ?? null, id],
      dbName,
    );

    const updated = await getQuery(
      `SELECT s.id, s.dance_course_id, s.session_date, s.comment, s.created_at, dc.semester, dg.name as dance_group_name
       FROM sessions s
       LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE s.id = ?`,
      [id],
      dbName,
    );

    res.json(updated);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

export async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(`DELETE FROM sessions WHERE id = ?`, [id], dbName);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

// Session Choreographies endpoints

function serializeSessionChoreography(row) {
  return { ...row, is_new: Boolean(row.is_new), auto_repeat: Boolean(row.auto_repeat) };
}

export async function getSessionChoreographies(req, res) {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const rows = await allQuery(
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
      [session_id],
      dbName,
    );

    res.json(rows.map(serializeSessionChoreography));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch session choreographies' });
  }
}

export async function addChoreographyToSession(req, res) {
  try {
    const { session_id, choreography_id } = req.body;

    if (!session_id || !choreography_id) {
      return res.status(400).json({ error: 'Session ID and choreography ID are required' });
    }

    const choreography = await addSessionChoreography(session_id, choreography_id);
    if (!choreography) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(201).json(serializeSessionChoreography(choreography));
  } catch (error) {
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Choreography already added to this session' });
    }
    res.status(500).json({ error: 'Failed to add choreography to session' });
  }
}

export async function removeChoreographyFromSession(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(
      `DELETE FROM session_choreographies WHERE id = ? OR repeat_source_id = ?`,
      [id, id],
      dbName,
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session choreography not found' });
    }

    res.json({ message: 'Choreography removed from session successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to remove choreography from session' });
  }
}

export async function reorderSessionContents(req, res) {
  const sessionIds = req.body?.session_ids;
  if (
    !Array.isArray(sessionIds) ||
    sessionIds.length < 2 ||
    sessionIds.some((sessionId) => !Number.isSafeInteger(sessionId) || sessionId <= 0) ||
    new Set(sessionIds).size !== sessionIds.length
  ) {
    return res.status(400).json({ error: 'Provide at least two unique session IDs' });
  }

  try {
    const result = await rearrangeSessionContents(sessionIds, 'reorder');
    if (result === 'not_found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (result === 'different_course') {
      return res.status(400).json({ error: 'Sessions must belong to the same course' });
    }
    res.json({ message: 'Session contents reordered successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to reorder session contents' });
  }
}

export async function swapSessions(req, res) {
  try {
    const sessionIdA = Number.parseInt(req.params.sessionId, 10);
    const sessionIdB = Number.parseInt(req.params.targetSessionId, 10);

    if (!Number.isFinite(sessionIdA) || !Number.isFinite(sessionIdB) || sessionIdA === sessionIdB) {
      return res.status(400).json({ error: 'Invalid session IDs' });
    }

    const result = await rearrangeSessionContents([sessionIdA, sessionIdB], 'swap');
    if (result === 'not_found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (result === 'different_course') {
      return res.status(400).json({ error: 'Sessions must belong to the same course' });
    }
    res.json({ message: 'Sessions swapped successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to swap sessions' });
  }
}
