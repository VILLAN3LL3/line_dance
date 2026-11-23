import { describe, it, expect } from 'vitest';
import {
  getSongIssues,
  isHttpUrl,
  normalizeSongs,
  planSongChanges,
} from '../../features/choreographies/song-operations.ts';
import type { SongInput } from '../../features/choreographies/song-operations.ts';

describe('isHttpUrl', () => {
  it('accepts only http and https links', () => {
    expect(isHttpUrl('https://www.youtube.com/watch?v=1')).toBe(true);
    expect(isHttpUrl(' http://example.com ')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
  });
});

describe('getSongIssues', () => {
  it('ignores missing and blank songs', () => {
    expect(getSongIssues(undefined)).toEqual([]);
    expect(getSongIssues([])).toEqual([]);
    expect(getSongIssues([{ title: ' ', artist: '' }, {}])).toEqual([]);
  });

  it('rejects a non-array and malformed rows', () => {
    expect(getSongIssues('song')).toEqual([{ field: 'choreography_songs', key: 'invalid_songs' }]);
    expect(getSongIssues([{ title: 5 }])).toEqual([
      { field: 'choreography_songs.0', key: 'invalid_songs' },
    ]);
  });

  it('requires a title as soon as a row has other content', () => {
    expect(getSongIssues([{ title: 'Ok' }, { title: '', artist: 'Artist' }])).toEqual([
      { field: 'choreography_songs.1.title', key: 'required' },
    ]);
    expect(getSongIssues([{ title: '', note: 'x' }])).toEqual([
      { field: 'choreography_songs.0.title', key: 'required' },
    ]);
  });

  it('flags invalid links per field', () => {
    expect(
      getSongIssues([
        {
          title: 'A',
          youtube_url: 'javascript:alert(1)',
          spotify_url: 'https://open.spotify.com/x',
        },
        { title: 'B', spotify_url: 'nope' },
      ]),
    ).toEqual([
      { field: 'choreography_songs.0.youtube_url', key: 'invalid_url' },
      { field: 'choreography_songs.1.spotify_url', key: 'invalid_url' },
    ]);
  });

  it('allows at most one favorite among non-blank rows', () => {
    expect(
      getSongIssues([
        { title: 'A', is_favorite: true },
        { title: 'B', is_favorite: true },
      ]),
    ).toEqual([{ field: 'choreography_songs', key: 'invalid_songs' }]);
    expect(
      getSongIssues([
        { title: 'A', is_favorite: true },
        { title: '', is_favorite: true },
      ]),
    ).toEqual([]);
  });
});

describe('normalizeSongs', () => {
  it('keeps the stored songs when nothing is submitted', () => {
    expect(normalizeSongs(undefined)).toBeUndefined();
  });

  it('marks non-array input as invalid', () => {
    expect(normalizeSongs('song')).toBeNull();
  });

  it('trims values, drops blank rows and keeps the order', () => {
    expect(
      normalizeSongs([
        { title: ' Second ', artist: ' Artist ', note: '  ', is_favorite: true },
        { title: '', artist: '' },
        { id: 7, title: 'Third', youtube_url: ' https://youtu.be/1 ' },
      ]),
    ).toEqual([
      {
        id: null,
        title: 'Second',
        artist: 'Artist',
        youtube_url: null,
        spotify_url: null,
        note: null,
        is_favorite: true,
      },
      {
        id: 7,
        title: 'Third',
        artist: null,
        youtube_url: 'https://youtu.be/1',
        spotify_url: null,
        note: null,
        is_favorite: false,
      },
    ]);
  });

  it('treats placeholder and repeated ids as new songs', () => {
    const songs = normalizeSongs([
      { id: 'client-uuid', title: 'A' },
      { id: 3, title: 'B' },
      { id: 3, title: 'C' },
    ]);
    expect(songs).toMatchObject([{ id: null }, { id: 3 }, { id: null }]);
  });
});

describe('planSongChanges', () => {
  const song = (id: number | null): SongInput => ({
    id,
    title: 'T',
    artist: null,
    youtube_url: null,
    spotify_url: null,
    note: null,
    is_favorite: false,
  });

  it('deletes stored songs that are not submitted and keeps known ids', () => {
    expect(planSongChanges([{ id: 1 }, { id: 2 }, { id: 3 }], [song(2), song(null)])).toEqual({
      deleteIds: [1, 3],
      existingIds: new Set([2]),
    });
  });

  it('does not adopt ids of other choreographies', () => {
    expect(planSongChanges([{ id: 1 }], [song(99)])).toEqual({
      deleteIds: [1],
      existingIds: new Set(),
    });
  });
});
