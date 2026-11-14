import { describe, expect, it } from 'vitest';
import {
  getCoursePdfFileName,
  getCoursePdfLinks,
  getTrainerVCard,
  prepareCoursePdfId,
} from '../../features/courses/pdf-operations.ts';

describe('course PDF operations', () => {
  it('creates safe filenames using the course id and semester', () => {
    expect(getCoursePdfFileName({ course_id: 42, semester: 'WS 2025/26' })).toBe(
      'Kurs-42-WS_2025_26.pdf',
    );
    expect(getCoursePdfFileName({ course_id: null, semester: null })).toBe('Kurs-Kurs.pdf');
  });

  it('includes only populated playlist links in their original order', () => {
    expect(
      getCoursePdfLinks({
        youtube_playlist_url: 'https://example.com/video',
        copperknob_list_url: '',
        spotify_playlist_url: 'https://example.com/music',
      }),
    ).toEqual([
      { label: 'YouTube Playlist', url: 'https://example.com/video' },
      { label: 'Spotify Playlist', url: 'https://example.com/music' },
    ]);
  });

  it('escapes trainer contact details in a vCard or omits it without a trainer', () => {
    expect(
      getTrainerVCard({
        trainer_id: null,
        trainer_name: null,
        trainer_phone: null,
        trainer_email: null,
      }),
    ).toBeNull();
    expect(
      getTrainerVCard({
        trainer_id: 1,
        trainer_name: 'Jane; Doe',
        trainer_phone: '123',
        trainer_email: 'jane@example.com',
      }),
    ).toContain(String.raw`FN:Jane\; Doe`);
  });

  it('keeps the ID as an unmodified string for the database lookup', () => {
    expect(prepareCoursePdfId({ id: '12suffix' })).toBe('12suffix');
    expect(prepareCoursePdfId({ id: '001' })).toBe('001');
    expect(() => prepareCoursePdfId({ id: 12 })).toThrow();
  });
});
