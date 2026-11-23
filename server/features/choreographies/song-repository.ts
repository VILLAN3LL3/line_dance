import { allQuery, getQuery, runQuery } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { SongInput } from './song-operations.ts';

type ChoreographyId = string | number;
export type SongRow = {
  id: number;
  title: string;
  artist: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  note: string | null;
  is_favorite: number;
};

export async function listSongs(choreographyId: ChoreographyId): Promise<SongRow[]> {
  return allQuery<SongRow>(
    `SELECT s.id, s.title, s.artist, s.youtube_url, s.spotify_url, s.note,
       CASE WHEN fav.song_id IS NULL THEN 0 ELSE 1 END AS is_favorite
     FROM choreography_songs s
     LEFT JOIN personal_data.choreography_favorite_songs fav
       ON fav.choreography_id = s.choreography_id AND fav.song_id = s.id
     WHERE s.choreography_id = ?
     ORDER BY s.position ASC, s.id ASC`,
    [choreographyId],
  );
}

export async function findSong(
  choreographyId: ChoreographyId,
  songId: ChoreographyId,
): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>(
    'SELECT id FROM choreography_songs WHERE choreography_id = ? AND id = ?',
    [choreographyId, songId],
  );
}

export async function insertSong(
  choreographyId: ChoreographyId,
  song: SongInput,
  position: number,
): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO choreography_songs (choreography_id, title, artist, youtube_url, spotify_url, note, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      choreographyId,
      song.title,
      song.artist,
      song.youtube_url,
      song.spotify_url,
      song.note,
      position,
    ],
  );
}

export async function updateSong(
  choreographyId: ChoreographyId,
  id: number,
  song: SongInput,
  position: number,
): Promise<WriteResult> {
  return runQuery(
    `UPDATE choreography_songs
     SET title = ?, artist = ?, youtube_url = ?, spotify_url = ?, note = ?, position = ?
     WHERE id = ? AND choreography_id = ?`,
    [
      song.title,
      song.artist,
      song.youtube_url,
      song.spotify_url,
      song.note,
      position,
      id,
      choreographyId,
    ],
  );
}

export async function deleteSongs(
  choreographyId: ChoreographyId,
  ids: number[],
): Promise<WriteResult> {
  if (ids.length === 0) return { id: 0, changes: 0 };
  return runQuery(
    `DELETE FROM choreography_songs WHERE choreography_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [choreographyId, ...ids],
  );
}

export async function deleteAllSongs(choreographyId: ChoreographyId): Promise<WriteResult> {
  return runQuery('DELETE FROM choreography_songs WHERE choreography_id = ?', [choreographyId]);
}

export async function saveFavoriteSong(
  choreographyId: ChoreographyId,
  songId: number,
): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO personal_data.choreography_favorite_songs (choreography_id, song_id)
     VALUES (?, ?)
     ON CONFLICT(choreography_id) DO UPDATE SET song_id = excluded.song_id`,
    [choreographyId, songId],
  );
}

export async function deleteFavoriteSong(choreographyId: ChoreographyId): Promise<WriteResult> {
  return runQuery(
    'DELETE FROM personal_data.choreography_favorite_songs WHERE choreography_id = ?',
    [choreographyId],
  );
}

/** Favorites live in another database, so nothing cascades when a choreography or song goes away. */
export async function deleteOrphanedFavoriteSongs(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM personal_data.choreography_favorite_songs
     WHERE song_id NOT IN (SELECT id FROM choreography_songs)
        OR choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
}
