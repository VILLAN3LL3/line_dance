import { useMemo, useState } from "react";

import type { SearchFilters } from "../../../types";
import { useAuthorsQuery, useLevelsQuery, useStepFiguresQuery, useTagsQuery } from "../../metadata";
import { areFiltersEqual } from "../model/search-session";
import {
  addAuthor,
  addFigure,
  addLevel,
  addTag,
  buildSearchFilters,
  changeLevelMode,
  changeWithoutStepFigures,
  clampMaxCount,
  defaultSearchBarFilterValues,
  findOptionIgnoreCase,
  includesIgnoreCase,
  isDatalistInputType,
  removeExcludedTag,
  removeIncludedTag,
  removeRequiredFigure,
  searchBarValuesFromFilters,
  toggleAuthor,
  toggleFigure,
  toggleLevel,
  type SearchBarFilterValues,
} from "../model/search-filters";
import { useSavedFiltersViewModel } from "../../saved-filters";
import { useMaxChoreographyCountQuery } from "./useMaxChoreographyCountQuery";

interface UseSearchBarViewModelOptions {
  filters: SearchFilters;
  onSearch: (filters: SearchFilters) => Promise<void>;
  isLoading: boolean;
}

const NO_OPTIONS: string[] = [];

/** ViewModel for the choreography search bar: filter form state, option lists and search intents. */
export const useSearchBarViewModel = ({
  filters,
  onSearch,
  isLoading,
}: UseSearchBarViewModelOptions) => {
  const levelsQuery = useLevelsQuery();
  const figuresQuery = useStepFiguresQuery();
  const tagsQuery = useTagsQuery();
  const authorsQuery = useAuthorsQuery();
  const maxCountQuery = useMaxChoreographyCountQuery();

  const levels = levelsQuery.data;
  const levelOptions = useMemo(() => levels?.map((level) => level.name) ?? NO_OPTIONS, [levels]);
  const levelValueOptions = useMemo(
    () => levels?.filter((level) => Number.isFinite(level.value)) ?? [],
    [levels],
  );
  const figureOptions = figuresQuery.data ?? NO_OPTIONS;
  const tagOptions = tagsQuery.data ?? NO_OPTIONS;
  const authorOptions = authorsQuery.data ?? NO_OPTIONS;
  const maxCountLimit = maxCountQuery.data ?? 0;

  const [rawValues, setRawValues] = useState<SearchBarFilterValues>(() =>
    searchBarValuesFromFilters(filters, 0),
  );
  const [previousFilters, setPreviousFilters] = useState<SearchFilters>(filters);

  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    setRawValues(searchBarValuesFromFilters(filters, maxCountLimit));
  }

  // The max count can only be validated once the server told us how many choreographies exist.
  const values = maxCountQuery.isSuccess
    ? { ...rawValues, maxCount: clampMaxCount(rawValues.maxCount, maxCountLimit) }
    : rawValues;

  const update = (patch: Partial<SearchBarFilterValues>) =>
    setRawValues((previous) => ({ ...previous, ...patch }));
  const transform = (change: (current: SearchBarFilterValues) => SearchBarFilterValues) =>
    setRawValues(change);

  const buildFilters = (): SearchFilters => buildSearchFilters(values, maxCountLimit);

  const applyLoadedFilters = async (loadedFilters: SearchFilters) => {
    setRawValues(searchBarValuesFromFilters(loadedFilters, maxCountLimit));
    await onSearch(loadedFilters);
  };

  const clearAllFilters = async () => {
    setRawValues(defaultSearchBarFilterValues(maxCountLimit));
    await onSearch({});
  };

  const search = async () => {
    await onSearch(buildFilters());
  };

  // Leaving an input must not reload (and flash) the results when nothing changed.
  const searchIfChanged = async () => {
    const built = buildFilters();
    if (!areFiltersEqual(built, filters)) await onSearch(built);
  };

  const savedFilters = useSavedFiltersViewModel({
    buildFilters,
    applyLoadedFilters,
    isLoading,
  });

  const inputLevel = (value: string, inputType?: string) => {
    update({ inputLevel: value });
    if (value.trim() && isDatalistInputType(inputType)) {
      transform((current) => addLevel(current, value, levelOptions));
    }
  };

  const inputFigure = (value: string, inputType?: string) => {
    if (values.withoutStepFigures) return;
    const trimmed = value.trim();
    update({ inputFigure: value });
    if (
      trimmed &&
      findOptionIgnoreCase(figureOptions, trimmed) &&
      !includesIgnoreCase(values.selectedFigures, trimmed) &&
      isDatalistInputType(inputType)
    ) {
      transform((current) => addFigure(current, value, figureOptions));
    }
  };

  const inputTag = (value: string, inputType?: string) => {
    const trimmed = value.trim();
    update({ inputTag: value });
    if (
      trimmed &&
      findOptionIgnoreCase(tagOptions, trimmed) &&
      !includesIgnoreCase(values.includedTags, trimmed) &&
      !includesIgnoreCase(values.excludedTags, trimmed) &&
      isDatalistInputType(inputType)
    ) {
      transform((current) => addTag(current, value, values.tagMode, tagOptions));
    }
  };

  const inputAuthor = (value: string, inputType?: string) => {
    const trimmed = value.trim();
    update({ inputAuthor: value });
    if (
      trimmed &&
      findOptionIgnoreCase(authorOptions, trimmed) &&
      !includesIgnoreCase(values.selectedAuthors, trimmed) &&
      isDatalistInputType(inputType)
    ) {
      transform((current) => addAuthor(current, value, authorOptions));
    }
  };

  return {
    state: {
      values,
      maxCountLimit,
      levelOptions,
      levelValueOptions,
      figureOptions,
      tagOptions,
      authorOptions,
      savedFilters: savedFilters.state,
    },
    actions: {
      buildFilters,
      applyLoadedFilters,
      clearAllFilters,
      search,
      searchIfChanged,
      changeSearchTerm: (searchTerm: string) => update({ searchTerm }),
      changeSongArtistTerm: (songArtistTerm: string) => update({ songArtistTerm }),
      changeLevelMode: (mode: SearchBarFilterValues["levelMode"]) =>
        transform((current) => changeLevelMode(current, mode)),
      inputLevel,
      addLevelFromInput: (value?: string) =>
        transform((current) => addLevel(current, value ?? current.inputLevel, levelOptions)),
      toggleLevel: (level: string) => transform((current) => toggleLevel(current, level)),
      changeMaxLevelValue: (maxLevelValue: number | null) =>
        update({ levelMode: "max", maxLevelValue }),
      changeMaxCount: (maxCount: number) => update({ maxCount }),
      inputFigure,
      addFigureFromInput: (value?: string) =>
        transform((current) => addFigure(current, value ?? current.inputFigure, figureOptions)),
      toggleFigure: (figure: string) => transform((current) => toggleFigure(current, figure)),
      removeRequiredFigure: (figure: string) =>
        transform((current) => removeRequiredFigure(current, figure)),
      changeWithoutStepFigures: (checked: boolean) =>
        transform((current) => changeWithoutStepFigures(current, checked)),
      changeStepFiguresMatchMode: (mode: SearchBarFilterValues["stepFiguresMatchMode"]) =>
        update({ stepFiguresMatchMode: mode }),
      inputTag,
      changeTagMode: (tagMode: SearchBarFilterValues["tagMode"]) => update({ tagMode }),
      addTagFromInput: (value?: string, mode?: "include" | "exclude") =>
        transform((current) =>
          addTag(current, value ?? current.inputTag, mode ?? current.tagMode, tagOptions),
        ),
      removeIncludedTag: (tag: string) => transform((current) => removeIncludedTag(current, tag)),
      removeExcludedTag: (tag: string) => transform((current) => removeExcludedTag(current, tag)),
      inputAuthor,
      addAuthorFromInput: (value?: string) =>
        transform((current) => addAuthor(current, value ?? current.inputAuthor, authorOptions)),
      toggleAuthor: (author: string) => transform((current) => toggleAuthor(current, author)),
      changeMinRating: (minRating: number | null) => update({ minRating }),
      savedFilters: savedFilters.actions,
    },
  };
};

export type SearchBarViewModel = ReturnType<typeof useSearchBarViewModel>;
