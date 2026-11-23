import type { ChoreographySong, ChoreographySongInput } from "../../../types";

export type SongField = "title" | "artist" | "youtube_url" | "spotify_url" | "note";

export function createEmptySong(): ChoreographySongInput {
  return {
    id: crypto.randomUUID(),
    title: "",
    artist: "",
    youtube_url: "",
    spotify_url: "",
    note: "",
    is_favorite: false,
  };
}

export const songHasContent = (song: ChoreographySongInput | undefined): boolean =>
  Boolean(
    song &&
    [song.title, song.artist, song.youtube_url, song.spotify_url, song.note].some((value) =>
      value?.trim(),
    ),
  );

/** Songs with content; the trailing empty row of the form does not count. */
export const countFilledSongs = (songs: ChoreographySongInput[]): number =>
  songs.filter(songHasContent).length;

/** The form always ends with one empty row so users can keep adding songs. */
export function ensureEmptySongRow(songs: ChoreographySongInput[]): ChoreographySongInput[] {
  const lastSong = songs.at(-1);
  return !lastSong || songHasContent(lastSong) ? [...songs, createEmptySong()] : songs;
}

export function createInitialSongs(songs: ChoreographySongInput[] = []): ChoreographySongInput[] {
  return ensureEmptySongRow(
    songs.map((song) => ({
      ...song,
      id: song.id ?? crypto.randomUUID(),
      artist: song.artist ?? "",
      youtube_url: song.youtube_url ?? "",
      spotify_url: song.spotify_url ?? "",
      note: song.note ?? "",
      is_favorite: song.is_favorite ?? false,
    })),
  );
}

export const getSongRowId = (songs: ChoreographySongInput[], index: number): string =>
  String(songs[index]?.id ?? index);

export function updateSongRow(
  songs: ChoreographySongInput[],
  index: number,
  field: SongField,
  value: string,
): ChoreographySongInput[] {
  const updated = songs.map((song, songIndex) =>
    songIndex === index ? { ...song, [field]: value } : song,
  );
  return index === updated.length - 1 ? ensureEmptySongRow(updated) : updated;
}

export const removeSongRow = (
  songs: ChoreographySongInput[],
  index: number,
): ChoreographySongInput[] =>
  ensureEmptySongRow(songs.filter((_, songIndex) => songIndex !== index));

export const clearSongRowErrors = (
  errors: Record<string, string>,
  rowId: string,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(errors).filter(([field]) => !field.startsWith(`choreography_songs.${rowId}.`)),
  );

/** At most one song is the favorite. */
export const setFavoriteSong = (
  songs: ChoreographySongInput[],
  index: number,
): ChoreographySongInput[] =>
  songs.map((song, songIndex) => ({ ...song, is_favorite: songIndex === index }));

/** Placeholder ids of rows that are not saved yet are not sent; the server assigns the id. */
export const toSubmittedSongs = (songs: ChoreographySongInput[]): ChoreographySongInput[] =>
  songs.map(({ id, ...song }) => (typeof id === "number" ? { id, ...song } : song));

/** Favorite first, the rest in their saved order. */
export function splitSongs(songs: ChoreographySong[]): {
  primary: ChoreographySong | null;
  alternatives: ChoreographySong[];
} {
  const primary = getDefaultSong(songs);
  return { primary, alternatives: songs.filter((song) => song !== primary) };
}

/** Without a favorite the first song is the default. */
export const getDefaultSong = (songs: ChoreographySong[]): ChoreographySong | null =>
  songs.find((song) => song.is_favorite) ?? songs[0] ?? null;

/** The song chosen for a session; a missing or stale choice falls back to the default song. */
export const resolveSessionSong = (
  songs: ChoreographySong[],
  songId: number | null,
): ChoreographySong | null =>
  (songId === null ? undefined : songs.find((song) => song.id === songId)) ?? getDefaultSong(songs);
