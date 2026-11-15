import "../../../../styles/SearchBar.css";

import React, { useState } from "react";

import { ActionButton } from "../../../../shared/ui";
import type { SearchFilters } from "../../../../types";
import { useSearchBarViewModel } from "../../viewmodels/useSearchBarViewModel";
import { ClearFiltersIcon } from "../ClearFiltersIcon";
import { SearchBarAdvancedFilters } from "./SearchBarAdvancedFilters";

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => Promise<void>;
  filters?: SearchFilters;
  isLoading?: boolean;
}

const EMPTY_FILTERS: SearchFilters = {};

const inputTypeOf = (e: React.ChangeEvent<HTMLInputElement>) =>
  (e.nativeEvent as InputEvent).inputType;

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  filters = EMPTY_FILTERS,
  isLoading = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { state, actions } = useSearchBarViewModel({ filters, onSearch });
  const { values } = state;

  const submitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void actions.search();
    }
  };

  return (
    <div className="search-bar">
      <div className="search-main">
        <input
          type="text"
          placeholder="Search choreographies by name..."
          value={values.searchTerm}
          onChange={(e) => actions.changeSearchTerm(e.target.value)}
          onKeyDown={submitOnEnter}
          onBlur={actions.searchIfChanged}
          className="search-input"
          disabled={isLoading}
        />
        <input
          type="text"
          placeholder="Search by song or artist..."
          value={values.songArtistTerm}
          onChange={(e) => actions.changeSongArtistTerm(e.target.value)}
          onKeyDown={submitOnEnter}
          onBlur={actions.searchIfChanged}
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
          onClick={actions.clearAllFilters}
          variant="secondary"
          disabled={isLoading}
          className="btn-clear-filters"
        >
          <span className="clear-filters-icon" aria-hidden="true">
            <ClearFiltersIcon />
          </span>
          <span>Clear All Filters</span>
        </ActionButton>
        {showAdvanced && (
          <ActionButton
            onClick={actions.search}
            variant="primary"
            disabled={isLoading}
            className="btn-apply-filters"
          >
            Apply Filters
          </ActionButton>
        )}
      </div>

      {showAdvanced && (
        <SearchBarAdvancedFilters
          levelMode={values.levelMode}
          selectedLevel={values.selectedLevel}
          inputLevel={values.inputLevel}
          levelOptions={state.levelOptions}
          maxLevelValue={values.maxLevelValue}
          maxLevelOptions={state.levelValueOptions}
          onLevelModeChange={actions.changeLevelMode}
          onLevelInput={(e) => actions.inputLevel(e.target.value, inputTypeOf(e))}
          onAddLevelFromInput={actions.addLevelFromInput}
          onToggleLevel={actions.toggleLevel}
          onMaxLevelValueChange={actions.changeMaxLevelValue}
          maxCount={values.maxCount}
          maxCountLimit={state.maxCountLimit}
          onMaxCountChange={actions.changeMaxCount}
          selectedFigures={values.selectedFigures}
          inputFigure={values.inputFigure}
          figureOptions={state.figureOptions}
          withoutStepFigures={values.withoutStepFigures}
          stepFiguresMatchMode={values.stepFiguresMatchMode}
          requiredFigures={values.requiredFigures}
          onFigureInput={(e) => actions.inputFigure(e.target.value, inputTypeOf(e))}
          onAddFigureFromInput={actions.addFigureFromInput}
          onToggleFigure={actions.toggleFigure}
          onToggleRequiredFigure={actions.removeRequiredFigure}
          onWithoutStepFiguresChange={actions.changeWithoutStepFigures}
          onStepFiguresMatchModeChange={actions.changeStepFiguresMatchMode}
          inputTag={values.inputTag}
          tagMode={values.tagMode}
          tagOptions={state.tagOptions}
          includedTags={values.includedTags}
          excludedTags={values.excludedTags}
          onTagInput={(e) => actions.inputTag(e.target.value, inputTypeOf(e))}
          onTagModeChange={actions.changeTagMode}
          onAddTagFromInput={actions.addTagFromInput}
          onRemoveIncludedTag={actions.removeIncludedTag}
          onRemoveExcludedTag={actions.removeExcludedTag}
          selectedAuthors={values.selectedAuthors}
          inputAuthor={values.inputAuthor}
          authorOptions={state.authorOptions}
          onAuthorInput={(e) => actions.inputAuthor(e.target.value, inputTypeOf(e))}
          onAddAuthorFromInput={actions.addAuthorFromInput}
          onToggleAuthor={actions.toggleAuthor}
          isLoading={isLoading}
          minRating={values.minRating}
          onMinRatingChange={actions.changeMinRating}
          buildFilters={actions.buildFilters}
          applyLoadedFilters={actions.applyLoadedFilters}
        />
      )}
    </div>
  );
};
