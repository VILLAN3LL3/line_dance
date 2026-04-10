import "../../styles/SearchBar.css";

import React, { useState } from "react";

import {
  defaultSearchBarFilterValues,
  searchBarValuesFromFilters,
  useSearchBarFilters,
} from "../../hooks/useSearchBarFilters";
import { SearchFilters } from "../../types";
import { ActionButton } from "../shared/ui";
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
    levelValueOptions,
    figureOptions,
    tagOptions,
    authorOptions,
  } = useSearchBarFilters(filters);

  const buildFilters = (): SearchFilters => ({
    search: values.searchTerm || undefined,
    level:
      values.levelMode === "selected" && values.selectedLevel.length > 0
        ? values.selectedLevel
        : undefined,
    max_level_value:
      values.levelMode === "max" && values.maxLevelValue !== null
        ? values.maxLevelValue
        : undefined,
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
    tags: values.includedTags.length > 0 ? values.includedTags : undefined,
    excluded_tags: values.excludedTags.length > 0 ? values.excludedTags : undefined,
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

  const removeIncludedTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      includedTags: prev.includedTags.filter((t) => t !== tag),
    }));
  };

  const removeExcludedTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      excludedTags: prev.excludedTags.filter((t) => t !== tag),
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

  const addTagFromInput = (tagValue?: string, tagMode: "include" | "exclude" = values.tagMode) => {
    const trimmed = (tagValue ?? values.inputTag).trim();
    if (!trimmed) {
      return;
    }

    if (tagMode === "include") {
      setValues((prev) => ({
        ...prev,
        includedTags: prev.includedTags.includes(trimmed)
          ? prev.includedTags
          : [...prev.includedTags, trimmed],
        excludedTags: prev.excludedTags.filter((tag) => tag !== trimmed),
        inputTag: "",
      }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      excludedTags: prev.excludedTags.includes(trimmed)
        ? prev.excludedTags
        : [...prev.excludedTags, trimmed],
      includedTags: prev.includedTags.filter((tag) => tag !== trimmed),
      inputTag: "",
    }));
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
    if (trimmed && levelOptions.includes(trimmed) && !values.selectedLevel.includes(trimmed)) {
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
    if (value.trim() && isDatalistSelection(e)) {
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
      !values.includedTags.includes(value.trim()) &&
      !values.excludedTags.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addTagFromInput(value, values.tagMode);
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
          levelMode={values.levelMode}
          selectedLevel={values.selectedLevel}
          inputLevel={values.inputLevel}
          levelOptions={levelOptions}
          maxLevelValue={values.maxLevelValue}
          maxLevelOptions={levelValueOptions}
          onLevelModeChange={(mode) =>
            setValues((prev) => ({
              ...prev,
              levelMode: mode,
              ...(mode === "selected"
                ? { maxLevelValue: null }
                : { selectedLevel: [], inputLevel: "" }),
            }))
          }
          onLevelInput={handleLevelInput}
          onAddLevelFromInput={addLevelFromInput}
          onToggleLevel={toggleLevel}
          onMaxLevelValueChange={(value) =>
            setValues((prev) => ({ ...prev, levelMode: "max", maxLevelValue: value }))
          }
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
          inputTag={values.inputTag}
          tagMode={values.tagMode}
          tagOptions={tagOptions}
          includedTags={values.includedTags}
          excludedTags={values.excludedTags}
          onTagInput={handleTagInput}
          onTagModeChange={(mode) => setValues((prev) => ({ ...prev, tagMode: mode }))}
          onAddTagFromInput={addTagFromInput}
          onRemoveIncludedTag={removeIncludedTag}
          onRemoveExcludedTag={removeExcludedTag}
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
          <ActionButton onClick={handleSearch} variant="primary" disabled={isLoading}>
            Apply Filters
          </ActionButton>
          <ActionButton onClick={handleClearAllFilters} variant="secondary" disabled={isLoading}>
            Clear All Filters
          </ActionButton>
        </div>
      )}
    </div>
  );
};
