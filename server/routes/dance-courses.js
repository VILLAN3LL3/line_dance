import { runQuery, getQuery, allQuery } from '../scripts/db.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const dbName = 'danceGroups';

// Dance Courses endpoints

export async function getDanceCourses(req, res) {
  try {
    const { dance_group_id } = req.query;

    let query = `SELECT dc.id, dc.course_id, dc.name, dc.dance_group_id, NULLIF(dc.semester, '') as semester, dc.start_date, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url, dc.trainer_id, dc.created_at, dg.name as dance_group_name,
                 t.name as trainer_name, t.phone as trainer_phone, t.email as trainer_email
                 FROM dance_courses dc
                 LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
                 LEFT JOIN trainers t ON dc.trainer_id = t.id`;
    let params = [];

    if (dance_group_id) {
      query += ` WHERE dc.dance_group_id = ?`;
      params.push(dance_group_id);
    }

    query += ` ORDER BY CASE WHEN dc.start_date IS NULL THEN 1 ELSE 0 END, dc.start_date ASC, dc.id ASC`;

    const rows = await allQuery(query, params, dbName);
    res.json(rows);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance courses' });
  }
}

export async function createDanceCourse(req, res) {
  try {
    const {
      course_id,
      name,
      dance_group_id,
      semester,
      start_date,
      youtube_playlist_url,
      copperknob_list_url,
      spotify_playlist_url,
      trainer_id,
    } = req.body;

    const normalizedCourseName = typeof name === 'string' ? name.trim() : '';
    const normalizedCourseId =
      course_id === null || course_id === undefined || course_id === ''
        ? null
        : Number.parseInt(String(course_id), 10);

    if (!dance_group_id) {
      return res.status(400).json({ error: 'Dance group ID is required' });
    }
    if (normalizedCourseId === null && !normalizedCourseName) {
      return res.status(400).json({ error: 'Course ID or name is required' });
    }

    // Verify dance group exists
    const group = await getQuery(
      `SELECT id FROM dance_groups WHERE id = ?`,
      [dance_group_id],
      dbName,
    );

    if (!group) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    if (trainer_id !== null && trainer_id !== undefined && trainer_id !== '') {
      const trainer = await getQuery(`SELECT id FROM trainers WHERE id = ?`, [trainer_id], dbName);
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }
    }

    const normalizedTrainerId = trainer_id ? Number.parseInt(String(trainer_id), 10) : null;

    const result = await runQuery(
      `INSERT INTO dance_courses (course_id, name, dance_group_id, semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url, trainer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedCourseId,
        normalizedCourseName || null,
        dance_group_id,
        semester || '',
        start_date || null,
        youtube_playlist_url || null,
        copperknob_list_url || null,
        spotify_playlist_url || null,
        normalizedTrainerId,
      ],
      dbName,
    );

    const course = await getQuery(
      `SELECT dc.id, dc.course_id, dc.name, dc.dance_group_id, NULLIF(dc.semester, '') as semester, dc.start_date, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url, dc.trainer_id, dc.created_at, dg.name as dance_group_name,
       t.name as trainer_name, t.phone as trainer_phone, t.email as trainer_email
       FROM dance_courses dc
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       LEFT JOIN trainers t ON dc.trainer_id = t.id
       WHERE dc.id = ?`,
      [result.id],
      dbName,
    );

    res.status(201).json(course);
  } catch (error) {
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A course for this group and semester already exists' });
    }
    res.status(500).json({ error: 'Failed to create dance course' });
  }
}

export async function updateDanceCourse(req, res) {
  try {
    const { id } = req.params;
    const {
      semester,
      course_id,
      name,
      start_date,
      youtube_playlist_url,
      copperknob_list_url,
      spotify_playlist_url,
      trainer_id,
    } = req.body;

    const existing = await getQuery(
      `SELECT id, course_id, name FROM dance_courses WHERE id = ?`,
      [id],
      dbName,
    );

    if (!existing) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    if (trainer_id !== null && trainer_id !== undefined && trainer_id !== '') {
      const trainer = await getQuery(`SELECT id FROM trainers WHERE id = ?`, [trainer_id], dbName);
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }
    }

    const normalizedTrainerId = trainer_id ? Number.parseInt(String(trainer_id), 10) : null;
    let normalizedCourseId = existing.course_id;
    if (course_id !== undefined) {
      normalizedCourseId =
        course_id === null || course_id === '' ? null : Number.parseInt(String(course_id), 10);
    }
    let normalizedCourseName = existing.name;
    if (name !== undefined) {
      normalizedCourseName = typeof name === 'string' ? name.trim() : '';
    }
    if (normalizedCourseId === null && !normalizedCourseName) {
      return res.status(400).json({ error: 'Course ID or name is required' });
    }

    await runQuery(
      `UPDATE dance_courses SET course_id = ?, name = ?, semester = ?, start_date = ?, youtube_playlist_url = ?, copperknob_list_url = ?, spotify_playlist_url = ?, trainer_id = ? WHERE id = ?`,
      [
        normalizedCourseId,
        normalizedCourseName || null,
        semester || '',
        start_date || null,
        youtube_playlist_url || null,
        copperknob_list_url || null,
        spotify_playlist_url || null,
        normalizedTrainerId,
        id,
      ],
      dbName,
    );

    const updated = await getQuery(
      `SELECT dc.id, dc.course_id, dc.name, dc.dance_group_id, NULLIF(dc.semester, '') as semester, dc.start_date, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url, dc.trainer_id, dc.created_at, dg.name as dance_group_name,
       t.name as trainer_name, t.phone as trainer_phone, t.email as trainer_email
       FROM dance_courses dc
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       LEFT JOIN trainers t ON dc.trainer_id = t.id
       WHERE dc.id = ?`,
      [id],
      dbName,
    );

    res.json(updated);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update dance course' });
  }
}

export async function deleteDanceCourse(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(`DELETE FROM dance_courses WHERE id = ?`, [id], dbName);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    res.json({ message: 'Dance course deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete dance course' });
  }
}
