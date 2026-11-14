export function escapeVCardValue(value) {
  return String(value ?? '')
    .replaceAll('\\', String.raw`\\`)
    .replaceAll(';', String.raw`\;`)
    .replaceAll(',', String.raw`\,`)
    .replaceAll('\n', String.raw`\n`);
}

export function getCoursePdfFileName(course) {
  const safeSemester = String(course.semester ?? 'Kurs')
    .split(/[^a-zA-Z0-9_-]+/)
    .filter(Boolean)
    .join('_');
  const courseFilePart = course.course_id === null ? '' : `${course.course_id}-`;
  return `Kurs-${courseFilePart}${safeSemester}.pdf`;
}

export function getCoursePdfLinks(course) {
  return [
    { label: 'YouTube Playlist', url: course.youtube_playlist_url },
    { label: 'Copperknob Step Sheets', url: course.copperknob_list_url },
    { label: 'Spotify Playlist', url: course.spotify_playlist_url },
  ].filter((entry) => Boolean(entry.url));
}

export function getTrainerVCard(course) {
  if (!course.trainer_id) return null;
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVCardValue(course.trainer_name)}\nTEL;TYPE=CELL:${escapeVCardValue(course.trainer_phone)}\nEMAIL;TYPE=INTERNET:${escapeVCardValue(course.trainer_email)}\nEND:VCARD`;
}
