import React from "react";

import type { LevelOption, SearchFilters } from "../../types";
import { SearchBarLevelFilter } from "./SearchBarLevelFilter";
import { SearchBarMaxCountFilter } from "./SearchBarMaxCountFilter";
import { SearchBarSavedConfigurationsPanel } from "./SearchBarSavedConfigurationsPanel";
import { SearchBarSelectableListFilter } from "./SearchBarSelectableListFilter";
import { SearchBarStepFiguresFilter } from "./SearchBarStepFiguresFilter";
import { SearchBarTagFilter } from "./SearchBarTagFilter";

interface SearchBarAdvancedFiltersProps {
  // Level
  levelMode: "selected" | "max";
  selectedLevel: string[];
  inputLevel: string;
  levelOptions: string[];
  maxLevelValue: number | null;
  maxLevelOptions: LevelOption[];
  onLevelModeChange: (mode: "selected" | "max") => void;
  onLevelInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLevelFromInput: (value?: string) => void;
  onToggleLevel: (level: string) => void;
  onMaxLevelValueChange: (value: number | null) => void;
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
  inputTag: string;
  tagMode: "include" | "exclude";
  tagOptions: string[];
  includedTags: string[];
  excludedTags: string[];
  onTagInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagModeChange: (mode: "include" | "exclude") => void;
  onAddTagFromInput: (value?: string, mode?: "include" | "exclude") => void;
  onRemoveIncludedTag: (tag: string) => void;
  onRemoveExcludedTag: (tag: string) => void;
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
  levelMode,
  selectedLevel,
  inputLevel,
  levelOptions,
  maxLevelValue,
  maxLevelOptions,
  onLevelModeChange,
  onLevelInput,
  onAddLevelFromInput,
  onToggleLevel,
  onMaxLevelValueChange,
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
  inputTag,
  tagMode,
  tagOptions,
  includedTags,
  excludedTags,
  onTagInput,
  onTagModeChange,
  onAddTagFromInput,
  onRemoveIncludedTag,
  onRemoveExcludedTag,
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

    <SearchBarLevelFilter
      levelMode={levelMode}
      selectedLevel={selectedLevel}
      inputLevel={inputLevel}
      levelOptions={levelOptions}
      maxLevelValue={maxLevelValue}
      maxLevelOptions={maxLevelOptions}
      isLoading={isLoading}
      onLevelModeChange={onLevelModeChange}
      onLevelInput={onLevelInput}
      onAddLevelFromInput={onAddLevelFromInput}
      onToggleLevel={onToggleLevel}
      onMaxLevelValueChange={onMaxLevelValueChange}
    />

    <SearchBarMaxCountFilter
      maxCount={maxCount}
      maxCountLimit={maxCountLimit}
      isLoading={isLoading}
      onMaxCountChange={onMaxCountChange}
    />

    <SearchBarStepFiguresFilter
      selectedFigures={selectedFigures}
      inputFigure={inputFigure}
      figureOptions={figureOptions}
      withoutStepFigures={withoutStepFigures}
      stepFiguresMatchMode={stepFiguresMatchMode}
      isLoading={isLoading}
      onFigureInput={onFigureInput}
      onAddFigureFromInput={onAddFigureFromInput}
      onToggleFigure={onToggleFigure}
      onWithoutStepFiguresChange={onWithoutStepFiguresChange}
      onStepFiguresMatchModeChange={onStepFiguresMatchModeChange}
    />

    <SearchBarTagFilter
      inputTag={inputTag}
      tagMode={tagMode}
      tagOptions={tagOptions}
      includedTags={includedTags}
      excludedTags={excludedTags}
      isLoading={isLoading}
      onTagInput={onTagInput}
      onTagModeChange={onTagModeChange}
      onAddTagFromInput={onAddTagFromInput}
      onRemoveIncludedTag={onRemoveIncludedTag}
      onRemoveExcludedTag={onRemoveExcludedTag}
    />

    <SearchBarSelectableListFilter
      label="Authors"
      inputId="author-input"
      listId="authors-list"
      inputValue={inputAuthor}
      options={authorOptions}
      selectedValues={selectedAuthors}
      placeholder="Add author..."
      isLoading={isLoading}
      onInputChange={(e) => onAuthorInput(e as React.ChangeEvent<HTMLInputElement>)}
      onAddFromInput={onAddAuthorFromInput}
      onToggleValue={onToggleAuthor}
    />
  </div>
);
