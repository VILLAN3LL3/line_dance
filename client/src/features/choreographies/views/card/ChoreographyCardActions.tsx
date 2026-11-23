import React from "react";

import { ActionButton } from "../../../../shared/ui";
import type { Choreography } from "../../../../types";
import { getDefaultSong } from "../../model/choreography-songs";
import { formatSongLabel, resolveSongLinks } from "../../model/song-search";

interface ChoreographyCardActionsProps {
  choreography: Choreography;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onCopy: () => Promise<void>;
}

export const ChoreographyCardActions: React.FC<ChoreographyCardActionsProps> = ({
  choreography,
  onEdit,
  onDelete,
  onCopy,
}) => {
  const defaultSong = getDefaultSong(choreography.choreography_songs);
  const songLabel = defaultSong ? formatSongLabel(defaultSong) : "";
  const songLinks = defaultSong ? resolveSongLinks(defaultSong) : null;

  return (
    <>
      {choreography.tutorial_video_url && (
        <a
          href={choreography.tutorial_video_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="btn-secondary btn-small tutorial-action"
          aria-label="Open tutorial in a new tab"
          title="Open tutorial in a new tab"
        >
          👩‍🎓
        </a>
      )}

      {choreography.step_sheet_link && (
        <a
          href={choreography.step_sheet_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="btn-secondary btn-small step-sheet-action"
          aria-label="Open step sheet in a new tab"
          title="Open step sheet in a new tab"
        >
          🦶
        </a>
      )}

      {songLinks?.youtubeUrl && (
        <a
          href={songLinks.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="btn-secondary btn-small youtube-action"
          aria-label={`Open "${songLabel}" on YouTube`}
          title={`Open on YouTube: ${songLabel}`}
        >
          ▶️
        </a>
      )}
      {songLinks?.spotifyUrl && (
        <a
          href={songLinks.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="btn-secondary btn-small spotify-action"
          aria-label={`Open "${songLabel}" on Spotify`}
          title={`Open on Spotify: ${songLabel}`}
        >
          🎵
        </a>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void onCopy();
        }}
        className="btn-secondary btn-small copy-action"
        aria-label="Copy choreography details"
        title="Copy choreography details"
      >
        ⤵️
      </button>

      {onEdit && (
        <a
          href={`/choreographies/${choreography.id}?edit=1`}
          onClick={(event) => {
            event.stopPropagation();
            if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
              event.preventDefault();
              onEdit(choreography.id);
            }
          }}
          className="btn-edit btn-small"
        >
          Edit
        </a>
      )}

      {onDelete && (
        <ActionButton
          onClick={(event) => {
            event.stopPropagation();
            onDelete(choreography.id);
          }}
          variant="secondary"
          className="btn-small delete-action"
          aria-label="Delete choreography"
          title="Delete choreography"
        >
          🗑️
        </ActionButton>
      )}
    </>
  );
};
