import React from "react";

import { ActionButton, FormField } from "../../../../shared/ui";
import type { ChoreographySongInput } from "../../../../types";
import { countFilledSongs, songHasContent, type SongField } from "../../model/choreography-songs";

interface SongsTabProps {
  songs: ChoreographySongInput[];
  genreOptions: string[];
  errors: Record<string, string>;
  onChange: (index: number, field: SongField, value: string) => void;
  onFavorite: (index: number) => void;
  onRemove: (index: number) => void;
}

const FIELDS: {
  field: SongField;
  label: string;
  placeholder: string;
  type?: string;
  optional?: boolean;
  inputMode?: "numeric";
  listId?: string;
}[] = [
  { field: "title", label: "Title", placeholder: "Enter song title" },
  { field: "artist", label: "Artist", placeholder: "Enter artist name" },
  {
    field: "youtube_url",
    label: "YouTube link",
    placeholder: "https://youtube.com/...",
    type: "url",
    optional: true,
  },
  {
    field: "spotify_url",
    label: "Spotify link",
    placeholder: "https://open.spotify.com/...",
    type: "url",
    optional: true,
  },
  { field: "note", label: "Note", placeholder: "e.g., slower version", optional: true },
  {
    field: "bpm",
    label: "BPM",
    placeholder: "e.g., 120",
    optional: true,
    inputMode: "numeric",
  },
  {
    field: "length_seconds",
    label: "Length",
    placeholder: "m:ss, e.g., 3:45",
    optional: true,
  },
  {
    field: "genre",
    label: "Genre",
    placeholder: "e.g., Country",
    optional: true,
    listId: "choreography-song-genres",
  },
];

export const SongsTab: React.FC<SongsTabProps> = ({
  songs,
  genreOptions,
  errors,
  onChange,
  onFavorite,
  onRemove,
}) => {
  // Without an explicit favorite the first song is the default, so that radio shows as selected.
  const explicitFavorite = songs.findIndex((song) => song.is_favorite && songHasContent(song));
  const favoriteIndex = explicitFavorite >= 0 ? explicitFavorite : songs.findIndex(songHasContent);
  const hasAlternatives = countFilledSongs(songs) > 1;

  return (
    <div className="form-section choreography-songs-form-section">
      {errors.choreography_songs && (
        <p role="alert" className="form-field-error">
          {errors.choreography_songs}
        </p>
      )}
      <datalist id="choreography-song-genres">
        {genreOptions.map((genre) => (
          <option key={genre} value={genre} />
        ))}
      </datalist>
      {songs.map((song, index) => {
        const rowId = String(song.id ?? index);
        const isFilled = songHasContent(song);

        return (
          <fieldset className="choreography-song-entry" key={rowId}>
            <legend className="sr-only">Song {index + 1}</legend>
            <div className="choreography-song-fields">
              {FIELDS.map(({ field, label, placeholder, type, optional, inputMode, listId }) => {
                const id = `choreography-song-${rowId}-${field}`;
                const error = errors[`choreography_songs.${rowId}.${field}`];
                return (
                  <FormField
                    key={field}
                    label={`${label} ${index + 1}${optional ? " (optional)" : ""}`}
                    htmlFor={id}
                    className="form-group"
                    error={error}
                  >
                    <input
                      type={type ?? "text"}
                      id={id}
                      value={song[field] ?? ""}
                      placeholder={placeholder}
                      inputMode={inputMode}
                      list={listId}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${id}-error` : undefined}
                      onChange={(event) => onChange(index, field, event.target.value)}
                    />
                  </FormField>
                );
              })}
            </div>
            {isFilled && (
              <div className="choreography-song-actions">
                {hasAlternatives && (
                  <label className="choreography-song-favorite">
                    <input
                      type="radio"
                      name="choreography-song-favorite"
                      aria-label={`Favorite song ${index + 1}`}
                      checked={index === favoriteIndex}
                      onChange={() => onFavorite(index)}
                    />
                    <span aria-hidden="true">Favorite</span>
                  </label>
                )}
                <ActionButton
                  type="button"
                  variant="secondary"
                  className="btn-small choreography-information-remove"
                  aria-label={`Remove song ${index + 1}`}
                  title={`Remove song ${index + 1}`}
                  onClick={() => onRemove(index)}
                >
                  🗑️
                </ActionButton>
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
};
