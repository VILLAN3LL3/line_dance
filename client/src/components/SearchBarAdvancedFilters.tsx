import React from "react";

import { SearchFilters } from "../types";
import { SearchBarSavedConfigurationsPanel } from "./SearchBarSavedConfigurationsPanel";

interface SearchBarAdvancedFiltersProps {
  // Level
  selectedLevel: string[];
  inputLevel: string;
  levelOptions: string[];
  onLevelInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLevelFromInput: (value?: string) => void;
  onToggleLevel: (level: string) => void;
  // Max count
  maxCount: number;
  maxCountLimit: number;
  onMaxCountChange: (value: number) => void;
  // Step figures
  selectedFigures: string[];
  inputFigure: string;
  figureOptions: string[];
  withoutStepFigures: boolean;
  stepFiguresMatchMode: "all" | "any" | "exact";
  onFigureInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFigureFromInput: (value?: string) => void;
  onToggleFigure: (figure: string) => void;
  onWithoutStepFiguresChange: (checked: boolean) => void;
  onStepFiguresMatchModeChange: (mode: "all" | "any" | "exact") => void;
  // Tags
  selectedTags: string[];
  inputTag: string;
  tagOptions: string[];
  onTagInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddTagFromInput: (value?: string) => void;
  onToggleTag: (tag: string) => void;
  // Authors
  selectedAuthors: string[];
  inputAuthor: string;
  authorOptions: string[];
  onAuthorInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddAuthorFromInput: (value?: string) => void;
  onToggleAuthor: (author: string) => void;
  // Shared
  isLoading: boolean;
  // For saved configurations panel
  buildFilters: () => SearchFilters;
  applyLoadedFilters: (filters: SearchFilters) => Promise<void>;
}

export const SearchBarAdvancedFilters: React.FC<SearchBarAdvancedFiltersProps> = ({
  selectedLevel,
  inputLevel,
  levelOptions,
  onLevelInput,
  onAddLevelFromInput,
  onToggleLevel,
  maxCount,
  maxCountLimit,
  onMaxCountChange,
  selectedFigures,
  inputFigure,
  figureOptions,
  withoutStepFigures,
  stepFiguresMatchMode,
  onFigureInput,
  onAddFigureFromInput,
  onToggleFigure,
  onWithoutStepFiguresChange,
  onStepFiguresMatchModeChange,
  selectedTags,
  inputTag,
  tagOptions,
  onTagInput,
  onAddTagFromInput,
  onToggleTag,
  selectedAuthors,
  inputAuthor,
  authorOptions,
  onAuthorInput,
  onAddAuthorFromInput,
  onToggleAuthor,
  isLoading,
  buildFilters,
  applyLoadedFilters,
}) => (
  <div className="advanced-filters">
    <SearchBarSavedConfigurationsPanel
      buildFilters={buildFilters}
      applyLoadedFilters={applyLoadedFilters}
      isLoading={isLoading}
    />

    <div className="filter-group">
      <label htmlFor="level-input">Level:</label>
      <div className="filter-input-container">
        <input
          id="level-input"
          type="text"
          value={inputLevel}
          onChange={onLevelInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddLevelFromInput();
            }
          }}
          placeholder="Add level..."
          list="levels-list"
          autoComplete="off"
          disabled={isLoading}
        />
        <datalist id="levels-list">
          {levelOptions.map((level) => (
            <option key={level} value={level} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => onAddLevelFromInput()}
          className="btn-add-filter"
          disabled={isLoading}
        >
          +
        </button>
      </div>
      <div className="filter-tags">
        {selectedLevel.map((level) => (
          <span key={level} className="filter-tag">
            {level}
            <button
              type="button"
              onClick={() => onToggleLevel(level)}
              className="btn-remove-tag"
              disabled={isLoading}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>

    <div className="filter-group">
      <label htmlFor="max-count-slider">Max Counts:</label>
      <div className="max-count-filter">
        <input
          id="max-count-slider"
          type="range"
          min={0}
          max={maxCountLimit}
          step={8}
          value={Math.min(maxCount, maxCountLimit)}
          onChange={(e) => onMaxCountChange(Number(e.target.value))}
          disabled={isLoading || maxCountLimit === 0}
        />
        <span className="max-count-value">
          {maxCountLimit === 0 || maxCount >= maxCountLimit
            ? `No limit (max ${maxCountLimit})`
            : `≤ ${maxCount}`}
        </span>
      </div>
    </div>

    <div className="filter-group">
      <label htmlFor="figure-input">Step Figures:</label>
      <div className="filter-checkbox">
        <label>
          <input
            type="checkbox"
            checked={withoutStepFigures}
            onChange={(e) => onWithoutStepFiguresChange(e.target.checked)}
            disabled={isLoading}
          />{" "}
          Search choreographies without step figures
        </label>
      </div>
      <div className="filter-input-container">
        <input
          id="figure-input"
          type="text"
          value={inputFigure}
          onChange={onFigureInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddFigureFromInput();
            }
          }}
          placeholder={
            withoutStepFigures
              ? "Readonly: using without-step-figures filter"
              : "Add step figure..."
          }
          list="figures-list"
          autoComplete="off"
          readOnly={withoutStepFigures}
          disabled={isLoading || withoutStepFigures}
        />
        <datalist id="figures-list">
          {figureOptions.map((figure) => (
            <option key={figure} value={figure} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => onAddFigureFromInput()}
          className="btn-add-filter"
          disabled={isLoading || withoutStepFigures}
        >
          +
        </button>
      </div>
      {selectedFigures.length > 0 && (
        <div className="filter-mode-toggle">
          <span>Match Mode:</span>
          <div className="match-mode-radios" role="radiogroup" aria-label="Step figure match mode">
            <label
              className={`match-mode-option mode-all ${stepFiguresMatchMode === "all" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="step-figures-match-mode"
                value="all"
                checked={stepFiguresMatchMode === "all"}
                onChange={() => onStepFiguresMatchModeChange("all")}
                disabled={isLoading}
              />{" "}
              AND (all selected)
            </label>
            <label
              className={`match-mode-option mode-any ${stepFiguresMatchMode === "any" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="step-figures-match-mode"
                value="any"
                checked={stepFiguresMatchMode === "any"}
                onChange={() => onStepFiguresMatchModeChange("any")}
                disabled={isLoading}
              />{" "}
              OR (any selected)
            </label>
            <label
              className={`match-mode-option mode-exact ${stepFiguresMatchMode === "exact" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="step-figures-match-mode"
                value="exact"
                checked={stepFiguresMatchMode === "exact"}
                onChange={() => onStepFiguresMatchModeChange("exact")}
                disabled={isLoading}
              />{" "}
              EXACT (only selected)
            </label>
          </div>
        </div>
      )}
      <div className="filter-tags">
        {selectedFigures.map((figure) => (
          <span key={figure} className="filter-tag">
            {figure}
            <button
              type="button"
              onClick={() => onToggleFigure(figure)}
              className="btn-remove-tag"
              disabled={isLoading}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>

    <div className="filter-group">
      <label htmlFor="tag-input">Tags:</label>
      <div className="filter-input-container">
        <input
          id="tag-input"
          type="text"
          value={inputTag}
          onChange={onTagInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddTagFromInput();
            }
          }}
          placeholder="Add tag..."
          list="tags-list"
          autoComplete="off"
          disabled={isLoading}
        />
        <datalist id="tags-list">
          {tagOptions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => onAddTagFromInput()}
          className="btn-add-filter"
          disabled={isLoading}
        >
          +
        </button>
      </div>
      <div className="filter-tags">
        {selectedTags.map((tag) => (
          <span key={tag} className="filter-tag">
            {tag}
            <button
              type="button"
              onClick={() => onToggleTag(tag)}
              className="btn-remove-tag"
              disabled={isLoading}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>

    <div className="filter-group">
      <label htmlFor="author-input">Authors:</label>
      <div className="filter-input-container">
        <input
          id="author-input"
          type="text"
          value={inputAuthor}
          onChange={onAuthorInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddAuthorFromInput();
            }
          }}
          placeholder="Add author..."
          list="authors-list"
          autoComplete="off"
          disabled={isLoading}
        />
        <datalist id="authors-list">
          {authorOptions.map((author) => (
            <option key={author} value={author} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => onAddAuthorFromInput()}
          className="btn-add-filter"
          disabled={isLoading}
        >
          +
        </button>
      </div>
      <div className="filter-tags">
        {selectedAuthors.map((author) => (
          <span key={author} className="filter-tag">
            {author}
            <button
              type="button"
              onClick={() => onToggleAuthor(author)}
              className="btn-remove-tag"
              disabled={isLoading}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  </div>
);
