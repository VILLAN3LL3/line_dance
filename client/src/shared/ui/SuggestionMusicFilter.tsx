import React from "react";

export interface SuggestionMusicFilterProps {
  minBpm: number | null;
  maxBpm: number | null;
  genres: string[];
  genreOptions: string[];
  disabled?: boolean;
  onMinBpmChange: (value: number | null) => void;
  onMaxBpmChange: (value: number | null) => void;
  onGenresChange: (genres: string[]) => void;
}

export const SuggestionMusicFilter: React.FC<SuggestionMusicFilterProps> = ({
  minBpm,
  maxBpm,
  genres,
  genreOptions,
  disabled = false,
  onMinBpmChange,
  onMaxBpmChange,
  onGenresChange,
}) => {
  const toNumber = (value: string): number | null => {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  return (
    <div className="suggestion-music-filter" role="group" aria-label="Music filters">
      <label>
        Min BPM
        <input
          type="number"
          min={0}
          value={minBpm ?? ""}
          onChange={(event) => onMinBpmChange(toNumber(event.target.value))}
          disabled={disabled}
        />
      </label>
      <label>
        Max BPM
        <input
          type="number"
          min={0}
          value={maxBpm ?? ""}
          onChange={(event) => onMaxBpmChange(toNumber(event.target.value))}
          disabled={disabled}
        />
      </label>
      <label>
        Genres
        <select
          multiple
          value={genres}
          onChange={(event) =>
            onGenresChange(Array.from(event.target.selectedOptions, (option) => option.value))
          }
          disabled={disabled}
        >
          {genreOptions.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
