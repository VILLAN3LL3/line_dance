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
