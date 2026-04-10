import { useEffect, useState } from "react";

import { getAuthors, getLevels, getMaxChoreographyCount, getStepFigures, getTags } from "../api";
import { LevelOption, SearchFilters } from "../types";

export interface SearchBarFilterValues {
  searchTerm: string;
  levelMode: "selected" | "max";
  selectedLevel: string[];
  maxLevelValue: number | null;
  maxCount: number;
  selectedFigures: string[];
  stepFiguresMatchMode: "all" | "any" | "exact";
  withoutStepFigures: boolean;
  includedTags: string[];
  excludedTags: string[];
  selectedAuthors: string[];
  tagMode: "include" | "exclude";
  inputLevel: string;
  inputFigure: string;
  inputTag: string;
  inputAuthor: string;
}

export const defaultSearchBarFilterValues = (maxCountLimit = 0): SearchBarFilterValues => ({
  searchTerm: "",
  levelMode: "selected",
  selectedLevel: [],
  maxLevelValue: null,
  maxCount: maxCountLimit,
  selectedFigures: [],
  stepFiguresMatchMode: "all",
  withoutStepFigures: false,
  includedTags: [],
  excludedTags: [],
  selectedAuthors: [],
  tagMode: "include",
  inputLevel: "",
  inputFigure: "",
  inputTag: "",
  inputAuthor: "",
});

export const searchBarValuesFromFilters = (
  filters: SearchFilters,
  maxCountLimit: number,
): SearchBarFilterValues => ({
  searchTerm: filters.search || "",
  levelMode:
    filters.max_level_value !== undefined &&
    (!Array.isArray(filters.level) || filters.level.length === 0)
      ? "max"
      : "selected",
  selectedLevel: Array.isArray(filters.level) ? filters.level : [],
  maxLevelValue: typeof filters.max_level_value === "number" ? filters.max_level_value : null,
  maxCount: filters.max_count ?? maxCountLimit,
  selectedFigures: filters.step_figures || [],
  stepFiguresMatchMode: filters.step_figures_match_mode || "all",
  withoutStepFigures: !!filters.without_step_figures,
  includedTags: filters.tags || [],
  excludedTags: filters.excluded_tags || [],
  selectedAuthors: filters.authors || [],
  tagMode:
    filters.excluded_tags &&
    filters.excluded_tags.length > 0 &&
    (!filters.tags || filters.tags.length === 0)
      ? "exclude"
      : "include",
  inputLevel: "",
  inputFigure: "",
  inputTag: "",
  inputAuthor: "",
});

export const useSearchBarFilters = (filters: SearchFilters = {}) => {
  const [values, setValues] = useState<SearchBarFilterValues>(() =>
    searchBarValuesFromFilters(filters, 0),
  );
  const [maxCountLimit, setMaxCountLimit] = useState<number>(0);
  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [levelValueOptions, setLevelValueOptions] = useState<LevelOption[]>([]);
  const [figureOptions, setFigureOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [authorOptions, setAuthorOptions] = useState<string[]>([]);
  const [previousFilters, setPreviousFilters] = useState<SearchFilters>(filters);

  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    setValues(searchBarValuesFromFilters(filters, maxCountLimit));
  }

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [levels, figures, tags, authors] = await Promise.all([
          getLevels(),
          getStepFigures(),
          getTags(),
          getAuthors(),
        ]);

        const maxExistingCount = await getMaxChoreographyCount();

        setLevelOptions(levels.map((level) => level.name));
        setLevelValueOptions(levels.filter((level) => Number.isFinite(level.value)));
        setFigureOptions(figures);
        setTagOptions(tags);
        setAuthorOptions(authors);
        setMaxCountLimit(maxExistingCount);
        setValues((previous) => ({
          ...previous,
          maxCount:
            previous.maxCount > 0 && previous.maxCount <= maxExistingCount
              ? previous.maxCount
              : maxExistingCount,
        }));
      } catch (error) {
        console.error("Error loading search filters:", error);
        setLevelOptions([]);
        setLevelValueOptions([]);
        setFigureOptions([]);
        setTagOptions([]);
        setAuthorOptions([]);
        setMaxCountLimit(0);
      }
    };

    void loadFilters();
  }, []);

  return {
    values,
    setValues,
    maxCountLimit,
    levelOptions,
    levelValueOptions,
    figureOptions,
    tagOptions,
    authorOptions,
  };
};
