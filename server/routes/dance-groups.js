import { runQuery, getQuery, allQuery } from '../db.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const dbName = 'danceGroups';

// Dance Groups endpoints

export async function getDanceGroups(req, res) {
  try {
    const rows = await allQuery(
      `SELECT id, name, created_at FROM dance_groups ORDER BY name ASC`,
      [],
      dbName
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching dance groups:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function createDanceGroup(req, res) {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await runQuery(
      `INSERT INTO dance_groups (name) VALUES (?)`,
      [name.trim()],
      dbName
    );

    const group = await getQuery(
      `SELECT id, name, created_at FROM dance_groups WHERE id = ?`,
      [result.id],
      dbName
    );

    res.status(201).json(group);
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A dance group with that name already exists' });
    }
    console.error('Error creating dance group:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getDanceGroupById(req, res) {
  try {
    const { id } = req.params;
    const group = await getQuery(
      `SELECT id, name, created_at FROM dance_groups WHERE id = ?`,
      [id],
      dbName
    );

    if (!group) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching dance group:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateDanceGroup(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await getQuery(
      `SELECT id FROM dance_groups WHERE id = ?`,
      [id],
      dbName
    );

    if (!existing) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    await runQuery(
      `UPDATE dance_groups SET name = ? WHERE id = ?`,
      [name.trim(), id],
      dbName
    );

    const updated = await getQuery(
      `SELECT id, name, created_at FROM dance_groups WHERE id = ?`,
      [id],
      dbName
    );

    res.json(updated);
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A dance group with that name already exists' });
    }
    console.error('Error updating dance group:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteDanceGroup(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(
      `DELETE FROM dance_groups WHERE id = ?`,
      [id],
      dbName
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    res.json({ message: 'Dance group deleted successfully' });
  } catch (error) {
    console.error('Error deleting dance group:', error);
    res.status(500).json({ error: error.message });
  }
}

// Dance Courses endpoints

export async function getDanceCourses(req, res) {
  try {
    const { dance_group_id } = req.query;
    
  let query = `SELECT dc.id, dc.dance_group_id, dc.semester, dc.start_date, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url, dc.created_at, dg.name as dance_group_name
                 FROM dance_courses dc
                 LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id`;
    let params = [];

    if (dance_group_id) {
      query += ` WHERE dc.dance_group_id = ?`;
      params.push(dance_group_id);
    }

    query += ` ORDER BY CASE WHEN dc.start_date IS NULL THEN 1 ELSE 0 END, dc.start_date ASC, dc.id ASC`;

    const rows = await allQuery(query, params, dbName);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching dance courses:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function createDanceCourse(req, res) {
  try {
  const { id, dance_group_id, semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url } = req.body;

    if (!dance_group_id || !semester) {
      return res.status(400).json({ error: 'Dance group ID and semester are required' });
    }

    // Verify dance group exists
    const group = await getQuery(
      `SELECT id FROM dance_groups WHERE id = ?`,
      [dance_group_id],
      dbName
    );

    if (!group) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    let result;
    if (id) {
       result = await runQuery(
         `INSERT INTO dance_courses (id, dance_group_id, semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [id, dance_group_id, semester, start_date || null, youtube_playlist_url || null, copperknob_list_url || null, spotify_playlist_url || null],
        dbName
      );
    } else {
       result = await runQuery(
         `INSERT INTO dance_courses (dance_group_id, semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url) VALUES (?, ?, ?, ?, ?, ?)`,
         [dance_group_id, semester, start_date || null, youtube_playlist_url || null, copperknob_list_url || null, spotify_playlist_url || null],
        dbName
      );
    }

    const course = await getQuery(
       `SELECT dc.id, dc.dance_group_id, dc.semester, dc.start_date, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url, dc.created_at, dg.name as dance_group_name
       FROM dance_courses dc
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE dc.id = ?`,
      [result.id],
      dbName
    );

    res.status(201).json(course);
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A course for this group and semester already exists' });
    }
    console.error('Error creating dance course:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateDanceCourse(req, res) {
  try {
    const { id } = req.params;
  const { semester, start_date, youtube_playlist_url, copperknob_list_url, spotify_playlist_url } = req.body;

    const existing = await getQuery(
      `SELECT id FROM dance_courses WHERE id = ?`,
      [id],
      dbName
    );

    if (!existing) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    await runQuery(
       `UPDATE dance_courses SET semester = ?, start_date = ?, youtube_playlist_url = ?, copperknob_list_url = ?, spotify_playlist_url = ? WHERE id = ?`,
       [semester, start_date || null, youtube_playlist_url || null, copperknob_list_url || null, spotify_playlist_url || null, id],
      dbName
    );

    const updated = await getQuery(
       `SELECT dc.id, dc.dance_group_id, dc.semester, dc.start_date, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url, dc.created_at, dg.name as dance_group_name
       FROM dance_courses dc
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE dc.id = ?`,
      [id],
      dbName
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating dance course:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteDanceCourse(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(
      `DELETE FROM dance_courses WHERE id = ?`,
      [id],
      dbName
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    res.json({ message: 'Dance course deleted successfully' });
  } catch (error) {
    console.error('Error deleting dance course:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function exportDanceCoursePdf(req, res) {
  try {
    const { id } = req.params;

    const course = await getQuery(
      `SELECT dc.id, dc.semester, dg.name as dance_group_name, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url
       FROM dance_courses dc
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE dc.id = ?`,
      [id],
      dbName
    );

    if (!course) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    // Fetch sessions for this course
    const sessions = await allQuery(
      `SELECT session_date FROM sessions WHERE dance_course_id = ? ORDER BY session_date ASC`,
      [id],
      dbName
    );

    const links = [
      { label: 'YouTube Playlist', url: course.youtube_playlist_url },
      { label: 'Copperknob Liste', url: course.copperknob_list_url },
      { label: 'Spotify Playlist', url: course.spotify_playlist_url },
    ].filter((entry) => Boolean(entry.url));

    const linksWithQr = await Promise.all(
      links.map(async (entry) => ({
        ...entry,
        qr: await QRCode.toBuffer(entry.url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 220,
        }),
      }))
    );

    const safeSemester = String(course.semester ?? 'Kurs')
      .split(/[^a-zA-Z0-9_-]+/)
      .filter(Boolean)
      .join('_');
    const fileName = `Kurs-${course.id}-${safeSemester}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const colors = {
      headerBg: '#E8F3FF',
      headerBorder: '#BFDDFC',
      title: '#164E8A',
      subtitle: '#1F2937',
      muted: '#6B7280',
      cardBg: '#F9FAFB',
      cardBorder: '#D1D5DB',
      footer: '#9CA3AF',
    };

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftMargin = doc.page.margins.left;
    const rightMargin = doc.page.margins.right;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    // Friendly header panel
    const headerY = doc.y;
    const headerHeight = 88;
    doc.roundedRect(leftMargin, headerY, contentWidth, headerHeight, 10)
      .fillAndStroke(colors.headerBg, colors.headerBorder);

    doc.fillColor(colors.title)
      .fontSize(24)
      .text(`${course.dance_group_name ?? 'Dance Group'}`, leftMargin, headerY + 16, {
        width: contentWidth,
        align: 'center',
      });

    doc.fillColor(colors.subtitle)
      .fontSize(14)
      .text(`Kurs ${course.id} (${course.semester})`, leftMargin, headerY + 50, {
        width: contentWidth,
        align: 'center',
      });

    doc.fillColor(colors.muted)
      .fontSize(10)
      .text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, leftMargin, headerY + 70, {
        width: contentWidth,
        align: 'center',
      });

    doc.fillColor('black');
    doc.y = headerY + headerHeight + 18;

    // Session dates section
    if (sessions.length > 0) {
      const sessionDatesText = sessions
        .map((s) => new Date(s.session_date).toLocaleDateString('de-DE'))
        .join(', ');
      
      doc.fillColor(colors.muted)
        .fontSize(10)
        .text('Termine: ' + sessionDatesText, leftMargin, doc.y, {
          width: contentWidth,
          align: 'left',
        });
      
      doc.y += 16;
    }

    if (linksWithQr.length === 0) {
      doc.roundedRect(leftMargin, doc.y, contentWidth, 56, 8)
        .fillAndStroke('#FFF7ED', '#FED7AA');
      doc.fillColor('#9A3412')
        .fontSize(12)
        .text('Keine Playlist-Links fuer diesen Kurs hinterlegt.', leftMargin, doc.y - 40, {
          width: contentWidth,
          align: 'center',
        });
      doc.end();
      return;
    }

    const columns = 2;
    const columnWidth = contentWidth / columns;
    const qrSize = 160;
    const labelHeight = 24;
    const rowHeight = 232;
    const gridStartY = doc.y;

    linksWithQr.forEach((entry, index) => {
      const columnIndex = index % columns;
      const rowIndex = Math.floor(index / columns);
      const blockX = leftMargin + columnIndex * columnWidth;
      const blockY = gridStartY + rowIndex * rowHeight;
      const cardPadding = 12;
      const cardWidth = columnWidth - 16;
      const cardHeight = 214;
      const cardX = blockX + 8;
      const cardY = blockY;
      const qrX = cardX + (cardWidth - qrSize) / 2;
      const qrY = cardY + labelHeight + cardPadding;

      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 10)
        .fillAndStroke(colors.cardBg, colors.cardBorder);

      doc.fillColor(colors.subtitle)
        .fontSize(13)
        .text(entry.label, cardX, cardY + 10, {
          width: cardWidth,
          align: 'center',
        });

      doc.image(entry.qr, qrX, qrY, { fit: [qrSize, qrSize] });

      doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 6)
        .lineWidth(1)
        .stroke('#E5E7EB');
    });

    // Subtle footer to balance the page
    doc.fillColor(colors.footer)
      .fontSize(9)
      .text('Line Dance Kursuebersicht', leftMargin, pageHeight - doc.page.margins.bottom - 12, {
        width: contentWidth,
        align: 'center',
      });

    doc.end();
  } catch (error) {
    console.error('Error exporting dance course PDF:', error);
    res.status(500).json({ error: error.message });
  }
}

// Sessions endpoints

export async function getSessions(req, res) {
  try {
    const { dance_course_id } = req.query;

    let query = `SELECT s.id, s.dance_course_id, s.session_date, s.created_at, dc.semester, dg.name as dance_group_name
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
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function createSession(req, res) {
  try {
    const { dance_course_id, session_date } = req.body;

    if (!dance_course_id || !session_date) {
      return res.status(400).json({ error: 'Dance course ID and session date are required' });
    }

    // Verify dance course exists
    const course = await getQuery(
      `SELECT id FROM dance_courses WHERE id = ?`,
      [dance_course_id],
      dbName
    );

    if (!course) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    const result = await runQuery(
      `INSERT INTO sessions (dance_course_id, session_date) VALUES (?, ?)`,
      [dance_course_id, session_date],
      dbName
    );

    const session = await getQuery(
      `SELECT s.id, s.dance_course_id, s.session_date, s.created_at, dc.semester, dg.name as dance_group_name
       FROM sessions s
       LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE s.id = ?`,
      [result.id],
      dbName
    );

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateSession(req, res) {
  try {
    const { id } = req.params;
    const { session_date } = req.body;

    if (!session_date) {
      return res.status(400).json({ error: 'Session date is required' });
    }

    const existing = await getQuery(
      `SELECT id FROM sessions WHERE id = ?`,
      [id],
      dbName
    );

    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await runQuery(
      `UPDATE sessions SET session_date = ? WHERE id = ?`,
      [session_date, id],
      dbName
    );

    const updated = await getQuery(
      `SELECT s.id, s.dance_course_id, s.session_date, s.created_at, dc.semester, dg.name as dance_group_name
       FROM sessions s
       LEFT JOIN dance_courses dc ON s.dance_course_id = dc.id
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       WHERE s.id = ?`,
      [id],
      dbName
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(
      `DELETE FROM sessions WHERE id = ?`,
      [id],
      dbName
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
}

// Session Choreographies endpoints

export async function getSessionChoreographies(req, res) {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const rows = await allQuery(
      `SELECT sc.id, sc.session_id, sc.choreography_id, sc.created_at
       FROM session_choreographies sc
       WHERE sc.session_id = ?
       ORDER BY sc.created_at DESC`,
      [session_id],
      dbName
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching session choreographies:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function addChoreographyToSession(req, res) {
  try {
    const { session_id, choreography_id } = req.body;

    if (!session_id || !choreography_id) {
      return res.status(400).json({ error: 'Session ID and choreography ID are required' });
    }

    // Verify session exists
    const session = await getQuery(
      `SELECT id FROM sessions WHERE id = ?`,
      [session_id],
      dbName
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = await runQuery(
      `INSERT INTO session_choreographies (session_id, choreography_id) VALUES (?, ?)`,
      [session_id, choreography_id],
      dbName
    );

    const choreography = await getQuery(
      `SELECT id, session_id, choreography_id, created_at
       FROM session_choreographies
       WHERE id = ?`,
      [result.id],
      dbName
    );

    res.status(201).json(choreography);
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Choreography already added to this session' });
    }
    console.error('Error adding choreography to session:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function removeChoreographyFromSession(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(
      `DELETE FROM session_choreographies WHERE id = ?`,
      [id],
      dbName
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session choreography not found' });
    }

    res.json({ message: 'Choreography removed from session successfully' });
  } catch (error) {
    console.error('Error removing choreography from session:', error);
    res.status(500).json({ error: error.message });
  }
}

// Learned Choreographies view

export async function getLearnedChoreographies(req, res) {
  try {
    const { dance_group_id } = req.query;

    let query = `SELECT * FROM learned_choreographies`;
    let params = [];

    if (dance_group_id) {
      query += ` WHERE dance_group_id = ?`;
      params.push(dance_group_id);
    }

    query += ` ORDER BY dance_group_name, last_danced_date DESC`;

    const rows = await allQuery(query, params, dbName);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching learned choreographies:', error);
    res.status(500).json({ error: error.message });
  }
}

// Group Levels endpoints

export async function getGroupLevels(req, res) {
  try {
    const { groupId } = req.params;

    if (!groupId || !Number.isFinite(Number.parseInt(groupId, 10))) {
      return res.status(400).json({ error: 'Valid group ID is required' });
    }

    const rows = await allQuery(
      `SELECT level FROM group_levels WHERE dance_group_id = ? ORDER BY level`,
      [Number.parseInt(groupId, 10)],
      dbName
    );

    const levels = rows.map((row) => row.level);
    res.json(levels);
  } catch (error) {
    console.error('Error fetching group levels:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function addGroupLevel(req, res) {
  try {
    const { groupId } = req.params;
    const { level } = req.body;

    if (!groupId || !Number.isFinite(Number.parseInt(groupId, 10))) {
      return res.status(400).json({ error: 'Valid group ID is required' });
    }

    if (!level || typeof level !== 'string' || !level.trim()) {
      return res.status(400).json({ error: 'Level is required' });
    }

    // Check if group exists
    const group = await getQuery(
      `SELECT id FROM dance_groups WHERE id = ?`,
      [Number.parseInt(groupId, 10)],
      dbName
    );

    if (!group) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    await runQuery(
      `INSERT OR IGNORE INTO group_levels (dance_group_id, level) VALUES (?, ?)`,
      [Number.parseInt(groupId, 10), level.trim()],
      dbName
    );

    res.status(201).json({ level: level.trim() });
  } catch (error) {
    console.error('Error adding group level:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function removeGroupLevel(req, res) {
  try {
    const { groupId, level } = req.params;

    if (!groupId || !Number.isFinite(Number.parseInt(groupId, 10))) {
      return res.status(400).json({ error: 'Valid group ID is required' });
    }

    if (!level || typeof level !== 'string' || !level.trim()) {
      return res.status(400).json({ error: 'Level is required' });
    }

    await runQuery(
      `DELETE FROM group_levels WHERE dance_group_id = ? AND level = ?`,
      [Number.parseInt(groupId, 10), level.trim()],
      dbName
    );

    res.json({ message: 'Level removed successfully' });
  } catch (error) {
    console.error('Error removing group level:', error);
    res.status(500).json({ error: error.message });
  }
}
