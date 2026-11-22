import type { SearchFilters } from "../../../types";

export interface SearchBarFilterValues {
  searchTerm: string;
  songArtistTerm: string;
  levelMode: "selected" | "max";
  selectedLevel: string[];
  maxLevelValue: number | null;
  useOfficialLevel: boolean;
  maxCount: number;
  selectedFigures: string[];
  stepFiguresMatchMode: "all" | "any" | "exact";
  withoutStepFigures: boolean;
  requiredFigures: string[];
  includedTags: string[];
  excludedTags: string[];
  selectedAuthors: string[];
  tagMode: "include" | "exclude";
  minRating: number | null;
  inputLevel: string;
  inputFigure: string;
  inputTag: string;
  inputAuthor: string;
}

export const defaultSearchBarFilterValues = (maxCountLimit = 0): SearchBarFilterValues => ({
  searchTerm: "",
  songArtistTerm: "",
  levelMode: "selected",
  selectedLevel: [],
  maxLevelValue: null,
  useOfficialLevel: false,
  maxCount: maxCountLimit,
  selectedFigures: [],
  stepFiguresMatchMode: "all",
  withoutStepFigures: false,
  requiredFigures: [],
  includedTags: [],
  excludedTags: [],
  selectedAuthors: [],
  tagMode: "include",
  minRating: null,
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
  songArtistTerm: filters.song_artist || "",
  levelMode:
    filters.max_level_value !== undefined &&
    (!Array.isArray(filters.level) || filters.level.length === 0)
      ? "max"
      : "selected",
  selectedLevel: Array.isArray(filters.level) ? filters.level : [],
  maxLevelValue: typeof filters.max_level_value === "number" ? filters.max_level_value : null,
  useOfficialLevel: filters.use_official_level === true,
  maxCount: filters.max_count ?? maxCountLimit,
  selectedFigures: filters.step_figures || [],
  stepFiguresMatchMode: filters.step_figures_match_mode || "all",
  withoutStepFigures: !!filters.without_step_figures,
  requiredFigures: filters.required_step_figures || [],
  includedTags: filters.tags || [],
  excludedTags: filters.excluded_tags || [],
  selectedAuthors: filters.authors || [],
  tagMode:
    filters.excluded_tags &&
    filters.excluded_tags.length > 0 &&
    (!filters.tags || filters.tags.length === 0)
      ? "exclude"
      : "include",
  minRating: typeof filters.min_rating === "number" ? filters.min_rating : null,
  inputLevel: "",
  inputFigure: "",
  inputTag: "",
  inputAuthor: "",
});

export const buildSearchFilters = (
  values: SearchBarFilterValues,
  maxCountLimit: number,
): SearchFilters => ({
  search: values.searchTerm || undefined,
  song_artist: values.songArtistTerm || undefined,
  level:
    values.levelMode === "selected" && values.selectedLevel.length > 0
      ? values.selectedLevel
      : undefined,
  max_level_value:
    values.levelMode === "max" && values.maxLevelValue !== null ? values.maxLevelValue : undefined,
  use_official_level: values.useOfficialLevel || undefined,
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
  required_step_figures: values.requiredFigures.length > 0 ? values.requiredFigures : undefined,
  tags: values.includedTags.length > 0 ? values.includedTags : undefined,
  excluded_tags: values.excludedTags.length > 0 ? values.excludedTags : undefined,
  authors: values.selectedAuthors.length > 0 ? values.selectedAuthors : undefined,
  min_rating: values.minRating ?? undefined,
});

/**
 * Keeps a user-chosen max count within the number of existing choreographies; falls back to the
 * limit when nothing sensible was chosen.
 */
export const clampMaxCount = (maxCount: number, maxCountLimit: number): number =>
  maxCount > 0 && maxCount <= maxCountLimit ? maxCount : maxCountLimit;

const normalizeText = (value: string) => value.trim().toLowerCase();

export const includesIgnoreCase = (items: string[], value: string): boolean =>
  items.some((item) => normalizeText(item) === normalizeText(value));

export const filterOutIgnoreCase = (items: string[], value: string): string[] =>
  items.filter((item) => normalizeText(item) !== normalizeText(value));

export const findOptionIgnoreCase = (options: string[], value: string): string | undefined =>
  options.find((option) => normalizeText(option) === normalizeText(value));

const toggleIgnoreCase = (items: string[], value: string): string[] =>
  includesIgnoreCase(items, value) ? filterOutIgnoreCase(items, value) : [...items, value];

type Values = SearchBarFilterValues;

export const toggleFigure = (values: Values, figure: string): Values =>
  values.withoutStepFigures
    ? values
    : { ...values, selectedFigures: toggleIgnoreCase(values.selectedFigures, figure) };

export const removeRequiredFigure = (values: Values, figure: string): Values => ({
  ...values,
  requiredFigures: filterOutIgnoreCase(values.requiredFigures, figure),
});

export const removeIncludedTag = (values: Values, tag: string): Values => ({
  ...values,
  includedTags: filterOutIgnoreCase(values.includedTags, tag),
});

export const removeExcludedTag = (values: Values, tag: string): Values => ({
  ...values,
  excludedTags: filterOutIgnoreCase(values.excludedTags, tag),
});

export const toggleAuthor = (values: Values, author: string): Values => ({
  ...values,
  selectedAuthors: toggleIgnoreCase(values.selectedAuthors, author),
});

export const toggleLevel = (values: Values, level: string): Values => ({
  ...values,
  selectedLevel: toggleIgnoreCase(values.selectedLevel, level),
});

/** Adds a typed or picked figure (resolved to the canonical option spelling) and clears the input. */
export const addFigure = (values: Values, input: string, figureOptions: string[]): Values => {
  if (values.withoutStepFigures) return values;
  const trimmed = input.trim();
  const figure = findOptionIgnoreCase(figureOptions, trimmed) ?? trimmed;
  if (!figure || includesIgnoreCase(values.selectedFigures, figure)) return values;
  return { ...values, selectedFigures: [...values.selectedFigures, figure], inputFigure: "" };
};

export const addTag = (
  values: Values,
  input: string,
  tagMode: "include" | "exclude",
  tagOptions: string[],
): Values => {
  const trimmed = input.trim();
  if (!trimmed) return values;
  const tag = findOptionIgnoreCase(tagOptions, trimmed) ?? trimmed;

  if (tagMode === "include") {
    return {
      ...values,
      includedTags: includesIgnoreCase(values.includedTags, tag)
        ? values.includedTags
        : [...values.includedTags, tag],
      excludedTags: filterOutIgnoreCase(values.excludedTags, tag),
      inputTag: "",
    };
  }

  return {
    ...values,
    excludedTags: includesIgnoreCase(values.excludedTags, tag)
      ? values.excludedTags
      : [...values.excludedTags, tag],
    includedTags: filterOutIgnoreCase(values.includedTags, tag),
    inputTag: "",
  };
};

export const addAuthor = (values: Values, input: string, authorOptions: string[]): Values => {
  const trimmed = input.trim();
  const author = findOptionIgnoreCase(authorOptions, trimmed) ?? trimmed;
  if (!author || includesIgnoreCase(values.selectedAuthors, author)) return values;
  return { ...values, selectedAuthors: [...values.selectedAuthors, author], inputAuthor: "" };
};

/** Levels must exist as options; free text that matches no option is ignored. */
export const addLevel = (values: Values, input: string, levelOptions: string[]): Values => {
  const level = findOptionIgnoreCase(levelOptions, input.trim());
  if (!level || includesIgnoreCase(values.selectedLevel, level)) return values;
  return { ...values, selectedLevel: [...values.selectedLevel, level], inputLevel: "" };
};

export const changeLevelMode = (values: Values, mode: Values["levelMode"]): Values => ({
  ...values,
  levelMode: mode,
  ...(mode === "selected" ? { maxLevelValue: null } : { selectedLevel: [], inputLevel: "" }),
});

export const changeWithoutStepFigures = (values: Values, checked: boolean): Values => ({
  ...values,
  withoutStepFigures: checked,
  ...(checked ? { selectedFigures: [], inputFigure: "" } : {}),
});

/** A datalist pick arrives as an input event of these types rather than typed characters. */
export const isDatalistInputType = (inputType: string | undefined): boolean =>
  inputType === "insertReplacementText" || inputType === "insertFromDrop";
