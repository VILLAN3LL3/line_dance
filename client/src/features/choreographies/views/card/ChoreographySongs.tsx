import React from "react";

import type { ChoreographySong } from "../../../../types";
import { splitSongs } from "../../model/choreography-songs";
import { formatSongLabel } from "../../model/song-search";
import { SongSearchButtons } from "../SongSearchButtons";

/** The favorite (otherwise first) song prominently, alternatives only when there are any. */
export const ChoreographySongs: React.FC<{ songs: ChoreographySong[] }> = ({ songs }) => {
  const { primary, alternatives } = splitSongs(songs);
  if (!primary) return null;

  return (
    <div className="music-section">
      <SongSearchButtons song={primary} />
      {alternatives.length > 0 && (
        <div className="alternative-songs">
          <strong>Alternative songs:</strong>
          <ul>
            {alternatives.map((song) => (
              <li key={song.id}>
                <span className="song-name">{formatSongLabel(song)}</span>
                {song.note?.trim() && <span className="song-note">{song.note.trim()}</span>}
                <SongSearchButtons song={song} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
