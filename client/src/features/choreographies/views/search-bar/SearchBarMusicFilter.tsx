import React from "react";

import { isLengthInputInvalid } from "../../model/search-filters";
import { SearchBarSelectableListFilter } from "./SearchBarSelectableListFilter";

export interface SearchBarMusicFilterProps {
  minBpm: string;
  maxBpm: string;
  maxLength: string;
  selectedGenres: string[];
  inputGenre: string;
  genreOptions: string[];
  isLoading: boolean;
  onMinBpmChange: (value: string) => void;
  onMaxBpmChange: (value: string) => void;
  onMaxLengthChange: (value: string) => void;
  onGenreInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddGenreFromInput: (value?: string) => void;
  onToggleGenre: (genre: string) => void;
}

/** Tempo, length and genre; a choreography matches when one of its songs fulfils all of them. */
export const SearchBarMusicFilter: React.FC<SearchBarMusicFilterProps> = ({
  minBpm,
  maxBpm,
  maxLength,
  selectedGenres,
  inputGenre,
  genreOptions,
  isLoading,
  onMinBpmChange,
  onMaxBpmChange,
  onMaxLengthChange,
  onGenreInput,
  onAddGenreFromInput,
  onToggleGenre,
}) => {
  const lengthInvalid = isLengthInputInvalid(maxLength);

  return (
    <div className="filter-section" role="group" aria-labelledby="music-filter-label">
      <div className="filter-label" id="music-filter-label">
        Music
      </div>
      <div className="music-filter-fields">
        <div className="music-filter-field">
          <label htmlFor="min-bpm-input">Min BPM</label>
          <input
            id="min-bpm-input"
            type="number"
            inputMode="numeric"
            min={0}
            value={minBpm}
            onChange={(e) => onMinBpmChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="music-filter-field">
          <label htmlFor="max-bpm-input">Max BPM</label>
          <input
            id="max-bpm-input"
            type="number"
            inputMode="numeric"
            min={0}
            value={maxBpm}
            onChange={(e) => onMaxBpmChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="music-filter-field">
          <label htmlFor="max-length-input">Max length</label>
          <input
            id="max-length-input"
            type="text"
            placeholder="m:ss"
            value={maxLength}
            aria-invalid={lengthInvalid ? true : undefined}
            aria-describedby={lengthInvalid ? "max-length-error" : undefined}
            onChange={(e) => onMaxLengthChange(e.target.value)}
            disabled={isLoading}
          />
          {lengthInvalid && (
            <span id="max-length-error" className="form-field-error">
              Enter the length as m:ss, e.g. 3:45.
            </span>
          )}
        </div>
      </div>
      <SearchBarSelectableListFilter
        label="Genres"
        inputId="genre-input"
        listId="genres-list"
        inputValue={inputGenre}
        options={genreOptions}
        selectedValues={selectedGenres}
        placeholder="Add genre..."
        isLoading={isLoading}
        onInputChange={(e) => onGenreInput(e as React.ChangeEvent<HTMLInputElement>)}
        onAddFromInput={onAddGenreFromInput}
        onToggleValue={onToggleGenre}
      />
    </div>
  );
};
