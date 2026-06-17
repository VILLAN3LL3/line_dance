import React from "react";

import { ActionButton } from "../shared/ui";

interface SongSearchButtonsProps {
  song?: string;
  artist?: string;
  compact?: boolean;
}

export const SongSearchButtons: React.FC<SongSearchButtonsProps> = ({
  song,
  artist,
  compact = false,
}) => {
  // Only show buttons if both song and artist are provided
  if (!song?.trim() || !artist?.trim()) {
    return null;
  }

  const encodeSearchQuery = (text: string): string => {
    return encodeURIComponent(text.trim()).replaceAll("%20", "+");
  };

  const youtubeQuery = `${encodeSearchQuery(artist)}+${encodeSearchQuery(song)}`;
  const spotifyQuery = `${encodeSearchQuery(artist)} ${encodeSearchQuery(song)}`;

  const youtubeUrl = `https://www.youtube.com/results?search_query=${youtubeQuery}`;
  const spotifyUrl = `https://open.spotify.com/search/${spotifyQuery}`;

  const handleExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <div className="song-search-buttons-compact">
        <button
          type="button"
          onClick={() => handleExternalLink(youtubeUrl)}
          className="btn-youtube"
          aria-label={`Search for "${artist} - ${song}" on YouTube`}
          title={`Search on YouTube: ${artist} - ${song}`}
        >
          🔎 YouTube
        </button>
        <button
          type="button"
          onClick={() => handleExternalLink(spotifyUrl)}
          className="btn-spotify"
          aria-label={`Search for "${artist} - ${song}" on Spotify`}
          title={`Search on Spotify: ${artist} - ${song}`}
        >
          🔎 Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="song-search-buttons">
      <p className="song-info">
        <strong>Song:</strong>
        <span className="song-name">
          {song} by {artist}
        </span>
      </p>
      <div className="button-group">
        <ActionButton
          variant="primary"
          onClick={() => handleExternalLink(youtubeUrl)}
          aria-label={`Search for "${artist} - ${song}" on YouTube`}
        >
          🔎 YouTube
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={() => handleExternalLink(spotifyUrl)}
          aria-label={`Search for "${artist} - ${song}" on Spotify`}
        >
          🔎 Spotify
        </ActionButton>
      </div>
    </div>
  );
};
