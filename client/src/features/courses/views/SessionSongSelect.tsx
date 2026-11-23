import React from "react";

import { formatSongLabel, getDefaultSong } from "../../choreographies";

import type { ChoreographySong } from "../../../types";

type SessionSongSelectProps = {
  choreographyName: string;
  songs: ChoreographySong[];
  songId: number | null;
  disabled?: boolean;
  onChange: (songId: number | null) => void;
};

/** Only offered when a dance has alternatives; with a single song there is nothing to choose. */
export const SessionSongSelect: React.FC<SessionSongSelectProps> = ({
  choreographyName,
  songs,
  songId,
  disabled = false,
  onChange,
}) => {
  if (songs.length < 2) return null;

  const defaultSong = getDefaultSong(songs);
  // A song that was deleted since it was chosen counts as the default.
  const value = songs.some((song) => song.id === songId) ? String(songId) : "";

  return (
    <select
      className="session-song-select"
      aria-label={`Song for ${choreographyName}`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">
        {defaultSong ? `Default: ${formatSongLabel(defaultSong)}` : "Default song"}
      </option>
      {songs.map((song) => (
        <option key={song.id} value={song.id}>
          {formatSongLabel(song)}
        </option>
      ))}
    </select>
  );
};
