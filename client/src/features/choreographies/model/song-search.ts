import type { ChoreographySong } from "../../../types";

function encodeSearchQuery(text: string): string {
  return encodeURIComponent(text.trim()).replaceAll("%20", "+");
}

export interface SongSearchUrls {
  youtubeUrl: string;
  spotifyUrl: string;
}

export function buildSongSearchUrls(song: string, artist: string): SongSearchUrls {
  const query = `${encodeSearchQuery(artist)}+${encodeSearchQuery(song)}`;

  return {
    youtubeUrl: `https://www.youtube.com/results?search_query=${query}`,
    spotifyUrl: `https://open.spotify.com/search/${query}`,
  };
}

export interface SongLinks {
  youtubeUrl: string | null;
  spotifyUrl: string | null;
}

type SongLinkSource = Pick<ChoreographySong, "title" | "artist" | "youtube_url" | "spotify_url">;

/**
 * A stored link wins; without one the link is a search for title and artist, which needs both.
 * Each platform falls back on its own, so a song may have a stored YouTube link and a Spotify search.
 */
export function resolveSongLinks(song: SongLinkSource): SongLinks {
  const title = song.title.trim();
  const artist = song.artist?.trim();
  const search = title && artist ? buildSongSearchUrls(title, artist) : null;
  return {
    youtubeUrl: song.youtube_url?.trim() || search?.youtubeUrl || null,
    spotifyUrl: song.spotify_url?.trim() || search?.spotifyUrl || null,
  };
}

/** "Artist - Title", or just the title when the artist is unknown. */
export const formatSongLabel = (song: Pick<ChoreographySong, "title" | "artist">): string =>
  song.artist?.trim() ? `${song.artist.trim()} - ${song.title.trim()}` : song.title.trim();
