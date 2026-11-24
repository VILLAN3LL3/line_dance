import type { SongInput } from './song-operations.ts';
import { planSongChanges } from './song-operations.ts';
import * as repository from './song-repository.ts';

type ChoreographyId = string | number;

/**
 * Replaces the songs of a choreography. Songs keep their id when they are submitted again, so
 * session assignments that reference them stay valid. Without an explicit favorite the first
 * song is the default, so no favorite is stored.
 */
export async function replaceSongs(id: ChoreographyId, songs: SongInput[]): Promise<void> {
  const stored = await repository.listSongs(id);
  const { deleteIds, existingIds } = planSongChanges(stored, songs);
  await repository.deleteSongs(id, deleteIds);

  const songIds = await songs.reduce<Promise<number[]>>(async (previous, song, position) => {
    const saved = await previous;
    const genreId = song.genre === null ? null : await repository.findOrCreateGenre(song.genre);
    if (song.id !== null && existingIds.has(song.id)) {
      await repository.updateSong(id, song.id, song, position, genreId);
      return [...saved, song.id];
    }
    return [...saved, (await repository.insertSong(id, song, position, genreId)).id];
  }, Promise.resolve([]));

  const favoriteIndex = songs.findIndex((song) => song.is_favorite);
  if (favoriteIndex === -1) await repository.deleteFavoriteSong(id);
  else await repository.saveFavoriteSong(id, songIds[favoriteIndex]);
}
