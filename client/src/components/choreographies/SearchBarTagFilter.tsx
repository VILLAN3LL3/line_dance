import React from "react";

import { Tag, TagGroup } from "../shared/ui";

interface SearchBarTagFilterProps {
  inputTag: string;
  tagMode: "include" | "exclude";
  tagOptions: string[];
  includedTags: string[];
  excludedTags: string[];
  isLoading: boolean;
  onTagInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagModeChange: (mode: "include" | "exclude") => void;
  onAddTagFromInput: (value?: string, mode?: "include" | "exclude") => void;
  onRemoveIncludedTag: (tag: string) => void;
  onRemoveExcludedTag: (tag: string) => void;
}

export const SearchBarTagFilter: React.FC<SearchBarTagFilterProps> = ({
  inputTag,
  tagMode,
  tagOptions,
  includedTags,
  excludedTags,
  isLoading,
  onTagInput,
  onTagModeChange,
  onAddTagFromInput,
  onRemoveIncludedTag,
  onRemoveExcludedTag,
}) => {
  const selectedTags = new Set([...includedTags, ...excludedTags]);

  return (
    <div className="filter-group">
      <label htmlFor="tag-input">Tags:</label>

      <div className="filter-mode-toggle">
        <span>When adding:</span>
        <div className="match-mode-radios" role="radiogroup" aria-label="Tag filter mode">
          <label
            className={`match-mode-option mode-tag-include ${tagMode === "include" ? "active" : ""}`}
          >
            <input
              type="radio"
              name="tag-filter-mode"
              value="include"
              checked={tagMode === "include"}
              onChange={() => onTagModeChange("include")}
              disabled={isLoading}
            />{" "}
            Include matches
          </label>
          <label
            className={`match-mode-option mode-tag-exclude ${tagMode === "exclude" ? "active" : ""}`}
          >
            <input
              type="radio"
              name="tag-filter-mode"
              value="exclude"
              checked={tagMode === "exclude"}
              onChange={() => onTagModeChange("exclude")}
              disabled={isLoading}
            />{" "}
            Exclude matches
          </label>
        </div>
      </div>

      <div className="filter-input-container filter-input-actions">
        <input
          id="tag-input"
          type="text"
          value={inputTag}
          onChange={onTagInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddTagFromInput(inputTag, tagMode);
            }
          }}
          placeholder={tagMode === "include" ? "Add tag to include..." : "Add tag to exclude..."}
          list="tags-list"
          autoComplete="off"
          disabled={isLoading}
        />
        <datalist id="tags-list">
          {tagOptions
            .filter((option) => !selectedTags.has(option))
            .map((option) => (
              <option key={option} value={option} />
            ))}
        </datalist>
        <button
          type="button"
          className="btn-add-filter"
          onClick={() => onAddTagFromInput(inputTag, tagMode)}
          disabled={isLoading}
        >
          {tagMode === "include" ? "+ Include" : "+ Exclude"}
        </button>
      </div>

      <div className="filter-list-sections">
        <div className="filter-list-section">
          <div className="filter-list-section-title">Included Tags</div>
          <TagGroup className="filter-tags">
            {includedTags.map((tag) => (
              <Tag
                key={tag}
                value={tag}
                className="filter-tag filter-tag-include"
                removeButtonClassName="btn-remove-tag"
                isRemovable
                disabled={isLoading}
                onRemove={() => onRemoveIncludedTag(tag)}
              />
            ))}
          </TagGroup>
        </div>

        <div className="filter-list-section">
          <div className="filter-list-section-title">Excluded Tags</div>
          <TagGroup className="filter-tags">
            {excludedTags.map((tag) => (
              <Tag
                key={tag}
                value={tag}
                className="filter-tag filter-tag-exclude"
                removeButtonClassName="btn-remove-tag"
                isRemovable
                disabled={isLoading}
                onRemove={() => onRemoveExcludedTag(tag)}
              />
            ))}
          </TagGroup>
        </div>
      </div>
    </div>
  );
};
