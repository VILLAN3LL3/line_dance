import { z } from 'zod';

const coursePdfId = z.string().brand<'CoursePdfId'>();
const coursePdfParams = z.object({ id: coursePdfId });

export type CoursePdfId = z.output<typeof coursePdfId>;
export type CoursePdf = {
  id: number;
  course_id: number | null;
  name: string | null;
  semester: string | null;
  dance_group_name: string | null;
  youtube_playlist_url: string | null;
  copperknob_list_url: string | null;
  spotify_playlist_url: string | null;
  trainer_id: number | null;
  trainer_name: string | null;
  trainer_phone: string | null;
  trainer_email: string | null;
};
export type CoursePdfLink = { label: string; url: string };

export function prepareCoursePdfId(input: unknown): CoursePdfId {
  return coursePdfParams.parse(input).id;
}

export function escapeVCardValue(value: string | number | boolean | null | undefined): string {
  return String(value ?? '')
    .replaceAll('\\', String.raw`\\`)
    .replaceAll(';', String.raw`\;`)
    .replaceAll(',', String.raw`\,`)
    .replaceAll('\n', String.raw`\n`);
}

export function getCoursePdfFileName(course: Pick<CoursePdf, 'course_id' | 'semester'>): string {
  const safeSemester = String(course.semester ?? 'Kurs')
    .split(/[^a-zA-Z0-9_-]+/)
    .filter(Boolean)
    .join('_');
  const courseFilePart = course.course_id === null ? '' : `${course.course_id}-`;
  return `Kurs-${courseFilePart}${safeSemester}.pdf`;
}

export function getCoursePdfLinks(
  course: Pick<CoursePdf, 'youtube_playlist_url' | 'copperknob_list_url' | 'spotify_playlist_url'>,
): CoursePdfLink[] {
  return [
    { label: 'YouTube Playlist', url: course.youtube_playlist_url },
    { label: 'Copperknob Step Sheets', url: course.copperknob_list_url },
    { label: 'Spotify Playlist', url: course.spotify_playlist_url },
  ].filter((entry): entry is CoursePdfLink => Boolean(entry.url));
}

export function getTrainerVCard(
  course: Pick<CoursePdf, 'trainer_id' | 'trainer_name' | 'trainer_phone' | 'trainer_email'>,
): string | null {
  if (!course.trainer_id) return null;
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVCardValue(course.trainer_name)}\nTEL;TYPE=CELL:${escapeVCardValue(course.trainer_phone)}\nEMAIL;TYPE=INTERNET:${escapeVCardValue(course.trainer_email)}\nEND:VCARD`;
}
