import React from "react";

import { ActionButton } from "../../../../shared/ui";
import type { Choreography } from "../../../../types";
import { buildSongSearchUrls } from "../../model/song-search";

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
  const song = choreography.song?.trim();
  const artist = choreography.artist?.trim();
  const songSearchUrls = song && artist ? buildSongSearchUrls(song, artist) : null;

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

      {songSearchUrls && (
        <>
          <a
            href={songSearchUrls.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="btn-secondary btn-small youtube-action"
            aria-label={`Search for "${artist} - ${song}" on YouTube`}
            title={`Search on YouTube: ${artist} - ${song}`}
          >
            ▶️
          </a>
          <a
            href={songSearchUrls.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="btn-secondary btn-small spotify-action"
            aria-label={`Search for "${artist} - ${song}" on Spotify`}
            title={`Search on Spotify: ${artist} - ${song}`}
          >
            🎵
          </a>
        </>
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
