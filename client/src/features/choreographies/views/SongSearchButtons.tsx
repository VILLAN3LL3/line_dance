import React from "react";

import { openInNewTab } from "../../../shared/browser/window";
import { formatSongLabel, resolveSongLinks } from "../model/song-search";
import { ActionButton } from "../../../shared/ui";
import type { ChoreographySong } from "../../../types";

interface SongSearchButtonsProps {
  song: Pick<ChoreographySong, "title" | "artist" | "youtube_url" | "spotify_url" | "note">;
  compact?: boolean;
}

/** Name of a song with buttons to YouTube and Spotify: stored links, otherwise a search. */
export const SongSearchButtons: React.FC<SongSearchButtonsProps> = ({ song, compact = false }) => {
  const label = formatSongLabel(song);
  const { youtubeUrl, spotifyUrl } = resolveSongLinks(song);
  const note = song.note?.trim();
  const links = [
    { url: youtubeUrl, name: "YouTube", className: "btn-youtube" },
    { url: spotifyUrl, name: "Spotify", className: "btn-spotify" },
  ].flatMap(({ url, ...link }) => (url ? [{ ...link, url }] : []));

  if (compact) {
    return (
      <div className="song-search-buttons-compact">
        {links.map(({ url, name, className }) => (
          <button
            key={name}
            type="button"
            onClick={() => openInNewTab(url)}
            className={className}
            aria-label={`Open "${label}" on ${name}`}
            title={`Open on ${name}: ${label}`}
          >
            🔎 {name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="song-search-buttons">
      <p className="song-info">
        <strong>Song:</strong>
        <span className="song-name">
          {song.title}
          {song.artist?.trim() ? ` by ${song.artist.trim()}` : ""}
        </span>
        {note && <span className="song-note">{note}</span>}
      </p>
      {links.length > 0 && (
        <div className="button-group">
          {links.map(({ url, name }) => (
            <ActionButton
              key={name}
              variant="primary"
              onClick={() => openInNewTab(url)}
              aria-label={`Open "${label}" on ${name}`}
            >
              🔎 {name}
            </ActionButton>
          ))}
        </div>
      )}
    </div>
  );
};
