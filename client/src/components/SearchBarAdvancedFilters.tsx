import React from "react";

import { SearchFilters } from "../types";
import { SearchBarMaxCountFilter } from "./SearchBarMaxCountFilter";
import { SearchBarSavedConfigurationsPanel } from "./SearchBarSavedConfigurationsPanel";
import { SearchBarSelectableListFilter } from "./SearchBarSelectableListFilter";
import { SearchBarStepFiguresFilter } from "./SearchBarStepFiguresFilter";

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

    <SearchBarSelectableListFilter
      label="Level"
      inputId="level-input"
      listId="levels-list"
      inputValue={inputLevel}
      options={levelOptions}
      selectedValues={selectedLevel}
      placeholder="Add level..."
      isLoading={isLoading}
      onInputChange={onLevelInput}
      onAddFromInput={onAddLevelFromInput}
      onToggleValue={onToggleLevel}
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

    <SearchBarSelectableListFilter
      label="Tags"
      inputId="tag-input"
      listId="tags-list"
      inputValue={inputTag}
      options={tagOptions}
      selectedValues={selectedTags}
      placeholder="Add tag..."
      isLoading={isLoading}
      onInputChange={onTagInput}
      onAddFromInput={onAddTagFromInput}
      onToggleValue={onToggleTag}
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
      onInputChange={onAuthorInput}
      onAddFromInput={onAddAuthorFromInput}
      onToggleValue={onToggleAuthor}
    />
  </div>
);
