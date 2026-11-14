import { getQuery, allQuery } from '../scripts/db.js';
import QRCode from 'qrcode';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';
import { renderCoursePdf } from './course-pdf-renderer.js';

const dbName = 'danceGroups';

export function escapeVCardValue(value) {
  return String(value ?? '')
    .replaceAll('\\', String.raw`\\`)
    .replaceAll(';', String.raw`\;`)
    .replaceAll(',', String.raw`\,`)
    .replaceAll('\n', String.raw`\n`);
}

function getCoursePdfFileName(course) {
  const safeSemester = String(course.semester ?? 'Kurs')
    .split(/[^a-zA-Z0-9_-]+/)
    .filter(Boolean)
    .join('_');
  const courseFilePart = course.course_id === null ? '' : `${course.course_id}-`;
  return `Kurs-${courseFilePart}${safeSemester}.pdf`;
}

export async function exportDanceCoursePdf(req, res) {
  try {
    const { id } = req.params;

    const course = await getQuery(
      `SELECT dc.id, dc.course_id, dc.name, NULLIF(dc.semester, '') as semester, dg.name as dance_group_name, dc.youtube_playlist_url, dc.copperknob_list_url, dc.spotify_playlist_url,
      t.id as trainer_id, t.name as trainer_name, t.phone as trainer_phone, t.email as trainer_email
       FROM dance_courses dc
       LEFT JOIN dance_groups dg ON dc.dance_group_id = dg.id
       LEFT JOIN trainers t ON dc.trainer_id = t.id
       WHERE dc.id = ?`,
      [id],
      dbName,
    );

    if (!course) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    // Fetch sessions for this course
    const sessions = await allQuery(
      `SELECT session_date FROM sessions WHERE dance_course_id = ? ORDER BY session_date ASC`,
      [id],
      dbName,
    );

    const links = [
      { label: 'YouTube Playlist', url: course.youtube_playlist_url },
      { label: 'Copperknob Step Sheets', url: course.copperknob_list_url },
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
      })),
    );

    const hasTrainer = Boolean(course.trainer_id);
    const trainerVCard = hasTrainer
      ? `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVCardValue(course.trainer_name)}\nTEL;TYPE=CELL:${escapeVCardValue(course.trainer_phone)}\nEMAIL;TYPE=INTERNET:${escapeVCardValue(course.trainer_email)}\nEND:VCARD`
      : null;
    const trainerQr = trainerVCard
      ? await QRCode.toBuffer(trainerVCard, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 180,
        })
      : null;

    const fileName = getCoursePdfFileName(course);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    renderCoursePdf(res, { course, sessions, linksWithQr, trainerQr });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
}
