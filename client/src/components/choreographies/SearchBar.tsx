import "../../styles/SearchBar.css";

import React, { useState } from "react";

import { defaultSearchBarFilterValues, searchBarValuesFromFilters, useSearchBarFilters } from "../../hooks/useSearchBarFilters";
import { SearchFilters } from "../../types";
import { ActionButton } from "../shared/ui";
import { ClearFiltersIcon } from "./ClearFiltersIcon";
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
    song_artist: values.songArtistTerm || undefined,
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
    min_rating: values.minRating ?? undefined,
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

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const includesIgnoreCase = (items: string[], value: string) =>
    items.some((item) => normalizeText(item) === normalizeText(value));
  const filterOutIgnoreCase = (items: string[], value: string) =>
    items.filter((item) => normalizeText(item) !== normalizeText(value));
  const findOptionIgnoreCase = (options: string[], value: string) =>
    options.find((option) => normalizeText(option) === normalizeText(value));

  const toggleFigure = (figure: string) => {
    if (values.withoutStepFigures) return;
    setValues((prev) => ({
      ...prev,
      selectedFigures: includesIgnoreCase(prev.selectedFigures, figure)
        ? filterOutIgnoreCase(prev.selectedFigures, figure)
        : [...prev.selectedFigures, figure],
    }));
  };

  const removeIncludedTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      includedTags: filterOutIgnoreCase(prev.includedTags, tag),
    }));
  };

  const removeExcludedTag = (tag: string) => {
    setValues((prev) => ({
      ...prev,
      excludedTags: filterOutIgnoreCase(prev.excludedTags, tag),
    }));
  };

  const toggleAuthor = (author: string) => {
    setValues((prev) => ({
      ...prev,
      selectedAuthors: includesIgnoreCase(prev.selectedAuthors, author)
        ? filterOutIgnoreCase(prev.selectedAuthors, author)
        : [...prev.selectedAuthors, author],
    }));
  };

  const addFigureFromInput = (figureValue?: string) => {
    if (values.withoutStepFigures) return;
    const trimmed = (figureValue ?? values.inputFigure).trim();
    const normalizedFigure = findOptionIgnoreCase(figureOptions, trimmed) ?? trimmed;
    if (normalizedFigure && !includesIgnoreCase(values.selectedFigures, normalizedFigure)) {
      setValues((prev) => ({
        ...prev,
        selectedFigures: [...prev.selectedFigures, normalizedFigure],
        inputFigure: "",
      }));
    }
  };

  const addTagFromInput = (tagValue?: string, tagMode: "include" | "exclude" = values.tagMode) => {
    const trimmed = (tagValue ?? values.inputTag).trim();
    if (!trimmed) {
      return;
    }

    const normalizedTag = findOptionIgnoreCase(tagOptions, trimmed) ?? trimmed;

    if (tagMode === "include") {
      setValues((prev) => ({
        ...prev,
        includedTags: includesIgnoreCase(prev.includedTags, normalizedTag)
          ? prev.includedTags
          : [...prev.includedTags, normalizedTag],
        excludedTags: filterOutIgnoreCase(prev.excludedTags, normalizedTag),
        inputTag: "",
      }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      excludedTags: includesIgnoreCase(prev.excludedTags, normalizedTag)
        ? prev.excludedTags
        : [...prev.excludedTags, normalizedTag],
      includedTags: filterOutIgnoreCase(prev.includedTags, normalizedTag),
      inputTag: "",
    }));
  };

  const addAuthorFromInput = (authorValue?: string) => {
    const trimmed = (authorValue ?? values.inputAuthor).trim();
    const normalizedAuthor = findOptionIgnoreCase(authorOptions, trimmed) ?? trimmed;
    if (normalizedAuthor && !includesIgnoreCase(values.selectedAuthors, normalizedAuthor)) {
      setValues((prev) => ({
        ...prev,
        selectedAuthors: [...prev.selectedAuthors, normalizedAuthor],
        inputAuthor: "",
      }));
    }
  };

  const toggleLevel = (level: string) => {
    setValues((prev) => ({
      ...prev,
      selectedLevel: includesIgnoreCase(prev.selectedLevel, level)
        ? filterOutIgnoreCase(prev.selectedLevel, level)
        : [...prev.selectedLevel, level],
    }));
  };

  const isDatalistSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    return inputType === "insertReplacementText" || inputType === "insertFromDrop";
  };

  const addLevelFromInput = (levelValue?: string) => {
    const trimmed = (levelValue ?? values.inputLevel).trim();
    const normalizedLevel = findOptionIgnoreCase(levelOptions, trimmed);
    if (normalizedLevel && !includesIgnoreCase(values.selectedLevel, normalizedLevel)) {
      setValues((prev) => ({
        ...prev,
        selectedLevel: [...prev.selectedLevel, normalizedLevel],
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
    const trimmed = value.trim();
    setValues((prev) => ({ ...prev, inputFigure: value }));
    if (
      trimmed &&
      findOptionIgnoreCase(figureOptions, trimmed) &&
      !includesIgnoreCase(values.selectedFigures, trimmed) &&
      isDatalistSelection(e)
    ) {
      addFigureFromInput(value);
    }
  };

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const trimmed = value.trim();
    setValues((prev) => ({ ...prev, inputTag: value }));
    if (
      trimmed &&
      findOptionIgnoreCase(tagOptions, trimmed) &&
      !includesIgnoreCase(values.includedTags, trimmed) &&
      !includesIgnoreCase(values.excludedTags, trimmed) &&
      isDatalistSelection(e)
    ) {
      addTagFromInput(value, values.tagMode);
    }
  };

  const handleAuthorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const trimmed = value.trim();
    setValues((prev) => ({ ...prev, inputAuthor: value }));
    if (
      trimmed &&
      findOptionIgnoreCase(authorOptions, trimmed) &&
      !includesIgnoreCase(values.selectedAuthors, trimmed) &&
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
        <input
          type="text"
          placeholder="Search by song or artist..."
          value={values.songArtistTerm}
          onChange={(e) => setValues((prev) => ({ ...prev, songArtistTerm: e.target.value }))}
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

      <div className="filter-toolbar">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn-toggle-advanced"
        >
          {showAdvanced ? "▼" : "▶"} Advanced Filters
        </button>
        <ActionButton
          onClick={handleClearAllFilters}
          variant="secondary"
          disabled={isLoading}
          className="btn-clear-filters"
        >
          <span className="clear-filters-icon" aria-hidden="true">
            <ClearFiltersIcon />
          </span>
          <span>Clear All Filters</span>
        </ActionButton>
      </div>

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
          minRating={values.minRating}
          onMinRatingChange={(value) => setValues((prev) => ({ ...prev, minRating: value }))}
          buildFilters={buildFilters}
          applyLoadedFilters={applyLoadedFilters}
        />
      )}

      {showAdvanced && (
        <div className="search-actions">
          <ActionButton onClick={handleSearch} variant="primary" disabled={isLoading}>
            Apply Filters
          </ActionButton>
        </div>
      )}
    </div>
  );
};
