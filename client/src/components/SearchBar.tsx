import "../styles/SearchBar.css";

import React, { useState } from "react";

import { defaultSearchBarFilterValues, searchBarValuesFromFilters, useSearchBarFilters } from "../hooks/useSearchBarFilters";
import { SearchFilters } from "../types";
import { SearchBarAdvancedFilters } from "./SearchBarAdvancedFilters";

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => Promise<void>;
  filters?: SearchFilters;
  isLoading?: boolean;
}

const EMPTY_FILTERS: SearchFilters = {};

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  filters = EMPTY_FILTERS,
  isLoading = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const {
    values,
    setValues,
    maxCountLimit,
    levelOptions,
    figureOptions,
    tagOptions,
    authorOptions,
  } = useSearchBarFilters(filters);

  const buildFilters = (): SearchFilters => ({
    search: values.searchTerm || undefined,
    level: values.selectedLevel.length > 0 ? values.selectedLevel : undefined,
    max_count: maxCountLimit > 0 ? values.maxCount : undefined,
    step_figures:
      !values.withoutStepFigures && values.selectedFigures.length > 0
        ? values.selectedFigures
        : undefined,
    step_figures_match_mode:
      !values.withoutStepFigures && values.selectedFigures.length > 0
        ? values.stepFiguresMatchMode
        : undefined,
    without_step_figures: values.withoutStepFigures || undefined,
    tags: values.selectedTags.length > 0 ? values.selectedTags : undefined,
    authors: values.selectedAuthors.length > 0 ? values.selectedAuthors : undefined,
  });

  const applyLoadedFilters = async (loadedFilters: SearchFilters) => {
    setValues(searchBarValuesFromFilters(loadedFilters, maxCountLimit));
    await onSearch(loadedFilters);
  };

  const handleClearAllFilters = async () => {
    setValues(defaultSearchBarFilterValues(maxCountLimit));
    await onSearch({});
  };

  const handleSearch = async () => {
    await onSearch(buildFilters());
  };

  const toggleFigure = (figure: string) => {
    if (values.withoutStepFigures) return;
    setValues((prev) => ({
      ...prev,
      selectedFigures: prev.selectedFigures.includes(figure)
        ? prev.selectedFigures.filter((f) => f !== figure)
        : [...prev.selectedFigures, figure],
    }));
  };

  const toggleTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const toggleAuthor = (author: string) => {
    setValues((prev) => ({
      ...prev,
      selectedAuthors: prev.selectedAuthors.includes(author)
        ? prev.selectedAuthors.filter((a) => a !== author)
        : [...prev.selectedAuthors, author],
    }));
  };

  const addFigureFromInput = (figureValue?: string) => {
    if (values.withoutStepFigures) return;
    const trimmed = (figureValue ?? values.inputFigure).trim();
    if (trimmed && !values.selectedFigures.includes(trimmed)) {
      setValues((prev) => ({
        ...prev,
        selectedFigures: [...prev.selectedFigures, trimmed],
        inputFigure: "",
      }));
    }
  };

  const addTagFromInput = (tagValue?: string) => {
    const trimmed = (tagValue ?? values.inputTag).trim();
    if (trimmed && !values.selectedTags.includes(trimmed)) {
      setValues((prev) => ({
        ...prev,
        selectedTags: [...prev.selectedTags, trimmed],
        inputTag: "",
      }));
    }
  };

  const addAuthorFromInput = (authorValue?: string) => {
    const trimmed = (authorValue ?? values.inputAuthor).trim();
    if (trimmed && !values.selectedAuthors.includes(trimmed)) {
      setValues((prev) => ({
        ...prev,
        selectedAuthors: [...prev.selectedAuthors, trimmed],
        inputAuthor: "",
      }));
    }
  };

  const toggleLevel = (level: string) => {
    setValues((prev) => ({
      ...prev,
      selectedLevel: prev.selectedLevel.includes(level)
        ? prev.selectedLevel.filter((l) => l !== level)
        : [...prev.selectedLevel, level],
    }));
  };

  const isDatalistSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    return inputType === "insertReplacementText" || inputType === "insertFromDrop";
  };

  const addLevelFromInput = (levelValue?: string) => {
    const trimmed = (levelValue ?? values.inputLevel).trim();
    if (trimmed && !values.selectedLevel.includes(trimmed)) {
      setValues((prev) => ({
        ...prev,
        selectedLevel: [...prev.selectedLevel, trimmed],
        inputLevel: "",
      }));
    }
  };

  const handleLevelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, inputLevel: value }));
    if (
      value.trim() &&
      levelOptions.includes(value.trim()) &&
      !values.selectedLevel.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addLevelFromInput(value);
    }
  };

  const handleFigureInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (values.withoutStepFigures) return;
    const value = e.target.value;
    setValues((prev) => ({ ...prev, inputFigure: value }));
    if (
      value.trim() &&
      figureOptions.includes(value.trim()) &&
      !values.selectedFigures.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addFigureFromInput(value);
    }
  };

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, inputTag: value }));
    if (
      value.trim() &&
      tagOptions.includes(value.trim()) &&
      !values.selectedTags.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addTagFromInput(value);
    }
  };

  const handleAuthorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, inputAuthor: value }));
    if (
      value.trim() &&
      authorOptions.includes(value.trim()) &&
      !values.selectedAuthors.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addAuthorFromInput(value);
    }
  };

  return (
    <div className="search-bar">
      <div className="search-main">
        <input
          type="text"
          placeholder="Search choreographies by name..."
          value={values.searchTerm}
          onChange={(e) => setValues((prev) => ({ ...prev, searchTerm: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          onBlur={handleSearch}
          className="search-input"
          disabled={isLoading}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="btn-toggle-advanced"
      >
        {showAdvanced ? "▼" : "▶"} Advanced Filters
      </button>

      {showAdvanced && (
        <SearchBarAdvancedFilters
          selectedLevel={values.selectedLevel}
          inputLevel={values.inputLevel}
          levelOptions={levelOptions}
          onLevelInput={handleLevelInput}
          onAddLevelFromInput={addLevelFromInput}
          onToggleLevel={toggleLevel}
          maxCount={values.maxCount}
          maxCountLimit={maxCountLimit}
          onMaxCountChange={(n) => setValues((prev) => ({ ...prev, maxCount: n }))}
          selectedFigures={values.selectedFigures}
          inputFigure={values.inputFigure}
          figureOptions={figureOptions}
          withoutStepFigures={values.withoutStepFigures}
          stepFiguresMatchMode={values.stepFiguresMatchMode}
          onFigureInput={handleFigureInput}
          onAddFigureFromInput={addFigureFromInput}
          onToggleFigure={toggleFigure}
          onWithoutStepFiguresChange={(checked) => {
            setValues((prev) => ({
              ...prev,
              withoutStepFigures: checked,
              ...(checked ? { selectedFigures: [], inputFigure: "" } : {}),
            }));
          }}
          onStepFiguresMatchModeChange={(mode) =>
            setValues((prev) => ({ ...prev, stepFiguresMatchMode: mode }))
          }
          selectedTags={values.selectedTags}
          inputTag={values.inputTag}
          tagOptions={tagOptions}
          onTagInput={handleTagInput}
          onAddTagFromInput={addTagFromInput}
          onToggleTag={toggleTag}
          selectedAuthors={values.selectedAuthors}
          inputAuthor={values.inputAuthor}
          authorOptions={authorOptions}
          onAuthorInput={handleAuthorInput}
          onAddAuthorFromInput={addAuthorFromInput}
          onToggleAuthor={toggleAuthor}
          isLoading={isLoading}
          buildFilters={buildFilters}
          applyLoadedFilters={applyLoadedFilters}
        />
      )}

      {showAdvanced && (
        <div className="search-actions">
          <button type="button" onClick={handleSearch} className="btn-primary" disabled={isLoading}>
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="btn-secondary"
            disabled={isLoading}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
