import React from "react";

import { AutoCompleteInput, Tag, TagGroup } from "../shared/ui";

import type { LevelOption } from "../../types";
interface SearchBarLevelFilterProps {
  levelMode: "selected" | "max";
  selectedLevel: string[];
  inputLevel: string;
  levelOptions: string[];
  maxLevelValue: number | null;
  maxLevelOptions: LevelOption[];
  isLoading: boolean;
  onLevelModeChange: (mode: "selected" | "max") => void;
  onLevelInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLevelFromInput: (value?: string) => void;
  onToggleLevel: (level: string) => void;
  onMaxLevelValueChange: (value: number | null) => void;
}

export const SearchBarLevelFilter: React.FC<SearchBarLevelFilterProps> = ({
  levelMode,
  selectedLevel,
  inputLevel,
  levelOptions,
  maxLevelValue,
  maxLevelOptions,
  isLoading,
  onLevelModeChange,
  onLevelInput,
  onAddLevelFromInput,
  onToggleLevel,
  onMaxLevelValueChange,
}) => (
  <div className="filter-group">
    <label htmlFor={levelMode === "selected" ? "level-input" : "max-level-select"}>Level:</label>

    <div className="filter-mode-toggle">
      <label>Mode:</label>
      <div className="match-mode-radios" role="radiogroup" aria-label="Level filter mode">
        <label
          className={`match-mode-option mode-level-list ${levelMode === "selected" ? "active" : ""}`}
        >
          <input
            type="radio"
            name="level-filter-mode"
            value="selected"
            checked={levelMode === "selected"}
            onChange={() => onLevelModeChange("selected")}
            disabled={isLoading}
          />{" "}
          Selected levels
        </label>
        <label
          className={`match-mode-option mode-level-max ${levelMode === "max" ? "active" : ""}`}
        >
          <input
            type="radio"
            name="level-filter-mode"
            value="max"
            checked={levelMode === "max"}
            onChange={() => onLevelModeChange("max")}
            disabled={isLoading}
          />{" "}
          Up to max level
        </label>
      </div>
    </div>

    {levelMode === "selected" ? (
      <>
        <div className="filter-input-container">
          <AutoCompleteInput
            id="level-input"
            listId="levels-list"
            value={inputLevel}
            options={levelOptions.filter((option) => !selectedLevel.includes(option))}
            onChange={onLevelInput}
            onAdd={onAddLevelFromInput}
            placeholder="Add level..."
            disabled={isLoading}
            autoComplete="off"
            addButtonLabel="+"
            addButtonClassName="btn-add-filter"
          />
        </div>
        <TagGroup className="filter-tags">
          {selectedLevel.map((value) => (
            <Tag
              key={value}
              value={value}
              className="filter-tag"
              removeButtonClassName="btn-remove-tag"
              isRemovable
              disabled={isLoading}
              onRemove={() => onToggleLevel(value)}
            />
          ))}
        </TagGroup>
      </>
    ) : (
      <>
        <div className="filter-input-container">
          <select
            id="max-level-select"
            value={maxLevelValue ?? ""}
            onChange={(e) =>
              onMaxLevelValueChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)
            }
            disabled={isLoading}
          >
            <option value="">No max level</option>
            {maxLevelOptions.map((option) => (
              <option key={option.id} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-selection-display">
          Includes choreographies at the selected level or any easier level.
        </div>
      </>
    )}
  </div>
);
