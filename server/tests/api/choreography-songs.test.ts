import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupChoreographyTestDb, clearChoreographyTables } from '../setup/testChoreographyDb.ts';
import app from '../setup/testChoreographyApp.ts';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

type Song = {
  id: number;
  title: string;
  artist?: string;
  youtube_url?: string;
  spotify_url?: string;
  note?: string;
  is_favorite: boolean;
};

async function createChoreo(songs?: unknown, name = 'Test Dance'): Promise<number> {
  const res = await request(app)
    .post('/api/choreographies')
    .send({ name, level: 'BEGINNER', choreography_songs: songs });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function getSongs(id: number): Promise<Song[]> {
  const res = await request(app).get(`/api/choreographies/${id}`);
  return res.body.choreography_songs;
}

async function updateSongs(id: number, songs: unknown): Promise<request.Response> {
  return request(app)
    .put(`/api/choreographies/${id}`)
    .send({ name: 'Test Dance', level: 'BEGINNER', choreography_songs: songs });
}

describe('choreography songs', () => {
  it('returns an empty list for a choreography without songs', async () => {
    const id = await createChoreo();
    expect(await getSongs(id)).toEqual([]);
  });

  it('stores several songs in order with optional links and note', async () => {
    const id = await createChoreo([
      { title: 'Main Song', artist: 'Artist' },
      {
        title: 'Alternative',
        youtube_url: 'https://www.youtube.com/watch?v=1',
        spotify_url: 'https://open.spotify.com/track/1',
        note: 'Slower',
      },
    ]);
    const songs = await getSongs(id);
    expect(songs).toMatchObject([
      { title: 'Main Song', artist: 'Artist', is_favorite: false },
      {
        title: 'Alternative',
        youtube_url: 'https://www.youtube.com/watch?v=1',
        spotify_url: 'https://open.spotify.com/track/1',
        note: 'Slower',
        is_favorite: false,
      },
    ]);
    expect(songs[0]).not.toHaveProperty('youtube_url');
  });

  it('ignores blank rows', async () => {
    const id = await createChoreo([{ title: 'Song' }, { title: '', artist: '' }]);
    expect(await getSongs(id)).toHaveLength(1);
  });

  it('keeps songs when an update does not mention them and removes them with an empty list', async () => {
    const id = await createChoreo([{ title: 'Song' }]);
    await request(app)
      .put(`/api/choreographies/${id}`)
      .send({ name: 'Renamed', level: 'BEGINNER' });
    expect(await getSongs(id)).toHaveLength(1);

    expect((await updateSongs(id, [])).status).toBe(200);
    expect(await getSongs(id)).toEqual([]);
  });

  it('keeps the id of submitted songs and replaces the others', async () => {
    const id = await createChoreo([{ title: 'A' }, { title: 'B' }]);
    const [first] = await getSongs(id);

    await updateSongs(id, [
      { id: first.id, title: 'A renamed' },
      { id: 'client-row', title: 'C' },
    ]);

    const songs = await getSongs(id);
    expect(songs.map((song) => song.title)).toEqual(['A renamed', 'C']);
    expect(songs[0].id).toBe(first.id);
  });

  it('does not take over songs of another choreography', async () => {
    const other = await createChoreo([{ title: 'Other' }], 'Other Dance');
    const [otherSong] = await getSongs(other);
    const id = await createChoreo([{ title: 'Mine' }]);

    await updateSongs(id, [{ id: otherSong.id, title: 'Hijacked' }]);

    expect((await getSongs(other))[0].title).toBe('Other');
    const songs = await getSongs(id);
    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('Hijacked');
    expect(songs[0].id).not.toBe(otherSong.id);
  });

  it('removes the songs together with the choreography', async () => {
    const id = await createChoreo([{ title: 'Song', is_favorite: true }]);
    expect((await request(app).delete(`/api/choreographies/${id}`)).status).toBe(200);
    expect((await request(app).get(`/api/choreographies/${id}`)).status).toBe(404);
  });
});

describe('favorite song', () => {
  it('marks the favorite and can move or remove it', async () => {
    const id = await createChoreo([{ title: 'A' }, { title: 'B', is_favorite: true }]);
    let songs = await getSongs(id);
    expect(songs.map((song) => song.is_favorite)).toEqual([false, true]);

    await updateSongs(id, [
      { id: songs[0].id, title: 'A', is_favorite: true },
      { id: songs[1].id, title: 'B' },
    ]);
    songs = await getSongs(id);
    expect(songs.map((song) => song.is_favorite)).toEqual([true, false]);

    await updateSongs(
      id,
      songs.map(({ id: songId, title }) => ({ id: songId, title })),
    );
    expect((await getSongs(id)).map((song) => song.is_favorite)).toEqual([false, false]);
  });

  it('marks a song as favorite that is created in the same request', async () => {
    const id = await createChoreo([{ title: 'A' }, { title: 'New', is_favorite: true }]);
    const songs = await getSongs(id);
    expect(songs.find((song) => song.title === 'New')?.is_favorite).toBe(true);
  });

  it('drops the favorite when its song is removed', async () => {
    const id = await createChoreo([{ title: 'A', is_favorite: true }, { title: 'B' }]);
    const [, second] = await getSongs(id);
    await updateSongs(id, [{ id: second.id, title: 'B' }]);
    expect((await getSongs(id)).map((song) => song.is_favorite)).toEqual([false]);
  });
});

describe('song validation', () => {
  async function createWith(songs: unknown): Promise<request.Response> {
    return request(app)
      .post('/api/choreographies')
      .send({ name: 'Test Dance', level: 'BEGINNER', choreography_songs: songs });
  }

  it('requires a title for rows with other content', async () => {
    const res = await createWith([{ title: 'Ok' }, { title: '', artist: 'Artist' }]);
    expect(res.status).toBe(400);
    expect(res.body.issues).toContainEqual({
      field: 'choreography_songs.1.title',
      key: 'required',
    });
  });

  it('rejects links that are not http(s) URLs', async () => {
    const res = await createWith([
      { title: 'A', youtube_url: 'javascript:alert(1)', spotify_url: 'nope' },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        { field: 'choreography_songs.0.youtube_url', key: 'invalid_url' },
        { field: 'choreography_songs.0.spotify_url', key: 'invalid_url' },
      ]),
    );
  });

  it('rejects several favorites and non-array input', async () => {
    const favorites = await createWith([
      { title: 'A', is_favorite: true },
      { title: 'B', is_favorite: true },
    ]);
    expect(favorites.status).toBe(400);
    expect(favorites.body.issues).toContainEqual({
      field: 'choreography_songs',
      key: 'invalid_songs',
    });

    const notArray = await createWith('A song');
    expect(notArray.status).toBe(400);
    expect(notArray.body.issues).toContainEqual({
      field: 'choreography_songs',
      key: 'invalid_songs',
    });
  });

  it('does not change stored songs when validation fails', async () => {
    const id = await createChoreo([{ title: 'Keep' }]);
    const res = await updateSongs(id, [{ title: '', note: 'x' }]);
    expect(res.status).toBe(400);
    expect((await getSongs(id)).map((song) => song.title)).toEqual(['Keep']);
  });
});

describe('song_artist search', () => {
  async function search(term: string): Promise<string[]> {
    const res = await request(app).get('/api/choreographies/search').query({ song_artist: term });
    return res.body.data.map((dance: { name: string }) => dance.name).sort();
  }

  it('finds a choreography by the title or artist of any of its songs', async () => {
    await createChoreo(
      [{ title: 'Main Song' }, { title: 'Remix', artist: 'DJ Alternative' }],
      'One',
    );
    await createChoreo([{ title: 'Other' }], 'Two');
    await createChoreo(undefined, 'Three');

    expect(await search('remix')).toEqual(['One']);
    expect(await search('alternative')).toEqual(['One']);
    expect(await search('main')).toEqual(['One']);
    expect(await search('other')).toEqual(['Two']);
    expect(await search('missing')).toEqual([]);
  });

  it('returns each choreography once when several songs match', async () => {
    await createChoreo([{ title: 'Love 1' }, { title: 'Love 2' }], 'Match');
    expect(await search('love')).toEqual(['Match']);
  });
});
