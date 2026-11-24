import { describe, expect, it } from "vitest";

import {
  addAuthor,
  addFigure,
  addGenre,
  addLevel,
  addTag,
  buildSearchFilters,
  changeLevelMode,
  changeWithoutStepFigures,
  clampMaxCount,
  defaultSearchBarFilterValues,
  isLengthInputInvalid,
  searchBarValuesFromFilters,
  toggleFigure,
  toggleGenre,
  toggleLevel,
} from "../../../features/choreographies/model/search-filters";

describe("search-filters model", () => {
  it("round-trips filters through form values", () => {
    const filters = {
      search: "abc",
      level: ["Beginner"],
      tags: ["classic"],
      step_figures: ["Mambo"],
      step_figures_match_mode: "any" as const,
      max_count: 10,
      min_rating: 3,
    };
    const values = searchBarValuesFromFilters(filters, 64);
    expect(buildSearchFilters(values, 64)).toMatchObject(filters);
  });

  it("round-trips the music filters with the length as m:ss text", () => {
    const filters = {
      min_bpm: 100,
      max_bpm: 130,
      max_length_seconds: 225,
      genres: ["Country", "Pop"],
    };
    const values = searchBarValuesFromFilters(filters, 0);
    expect(values).toMatchObject({ minBpm: "100", maxBpm: "130", maxLength: "3:45" });
    expect(buildSearchFilters(values, 0)).toMatchObject(filters);
  });

  it("sets no music filter for blank or unparsable text", () => {
    const built = buildSearchFilters(
      {
        ...defaultSearchBarFilterValues(),
        minBpm: "fast",
        maxBpm: "",
        maxLength: "225",
      },
      0,
    );
    expect(built).toMatchObject({
      min_bpm: undefined,
      max_bpm: undefined,
      max_length_seconds: undefined,
      genres: undefined,
    });
  });

  it("flags only non-empty text that is not a length", () => {
    expect(isLengthInputInvalid("")).toBe(false);
    expect(isLengthInputInvalid("3:45")).toBe(false);
    expect(isLengthInputInvalid("225")).toBe(true);
  });

  it("adds genres once, with the spelling of the option, and toggles them", () => {
    const base = defaultSearchBarFilterValues();
    const added = addGenre({ ...base, inputGenre: "country" }, "country", ["Country"]);
    expect(added.selectedGenres).toEqual(["Country"]);
    expect(added.inputGenre).toBe("");
    expect(addGenre(added, "COUNTRY", ["Country"])).toBe(added);
    expect(addGenre(base, "  ", [])).toBe(base);
    expect(toggleGenre(added, "country").selectedGenres).toEqual([]);
  });

  it("derives max level and exclude tag modes from the filters", () => {
    const values = searchBarValuesFromFilters({ max_level_value: 20, excluded_tags: ["x"] }, 5);
    expect(values.levelMode).toBe("max");
    expect(values.tagMode).toBe("exclude");
  });

  it("round-trips the official level option and omits it by default", () => {
    expect(
      buildSearchFilters(defaultSearchBarFilterValues(), 0).use_official_level,
    ).toBeUndefined();
    const values = searchBarValuesFromFilters({ use_official_level: true }, 0);
    expect(values.useOfficialLevel).toBe(true);
    expect(buildSearchFilters(values, 0).use_official_level).toBe(true);
    expect(searchBarValuesFromFilters({}, 0).useOfficialLevel).toBe(false);
  });

  it("omits max_count when there are no choreographies and step figures when none are wanted", () => {
    const values = { ...defaultSearchBarFilterValues(0), withoutStepFigures: true };
    const filters = buildSearchFilters(values, 0);
    expect(filters.max_count).toBeUndefined();
    expect(filters.step_figures).toBeUndefined();
    expect(filters.without_step_figures).toBe(true);
  });

  it("clamps the max count into the available range", () => {
    expect(clampMaxCount(5, 10)).toBe(5);
    expect(clampMaxCount(50, 10)).toBe(10);
    expect(clampMaxCount(0, 10)).toBe(10);
    expect(clampMaxCount(3, 0)).toBe(0);
  });

  it("toggles list entries case-insensitively and ignores figures when filtering for none", () => {
    const base = { ...defaultSearchBarFilterValues(), selectedFigures: ["Mambo"] };
    expect(toggleFigure(base, "mambo").selectedFigures).toEqual([]);
    const withoutFigures = { ...base, withoutStepFigures: true };
    expect(toggleFigure(withoutFigures, "Rumba")).toBe(withoutFigures);
    expect(toggleLevel(defaultSearchBarFilterValues(), "Beginner").selectedLevel).toEqual([
      "Beginner",
    ]);
  });

  it("adds options with their canonical spelling and clears the input", () => {
    const base = { ...defaultSearchBarFilterValues(), inputFigure: "mam" };
    expect(addFigure(base, " mambo ", ["Mambo"])).toMatchObject({
      selectedFigures: ["Mambo"],
      inputFigure: "",
    });
    expect(addFigure({ ...base, selectedFigures: ["Mambo"] }, "MAMBO", ["Mambo"])).toMatchObject({
      selectedFigures: ["Mambo"],
    });
    expect(addAuthor(base, "alice", ["Alice"]).selectedAuthors).toEqual(["Alice"]);
  });

  it("only adds levels that exist as options", () => {
    const base = defaultSearchBarFilterValues();
    expect(addLevel(base, "unknown", ["Beginner"])).toBe(base);
    expect(addLevel(base, "beginner", ["Beginner"]).selectedLevel).toEqual(["Beginner"]);
  });

  it("moves a tag between the included and excluded list", () => {
    const included = { ...defaultSearchBarFilterValues(), includedTags: ["Classic"] };
    const excluded = addTag(included, "classic", "exclude", ["Classic"]);
    expect(excluded.includedTags).toEqual([]);
    expect(excluded.excludedTags).toEqual(["Classic"]);
    expect(addTag(included, "   ", "include", [])).toBe(included);
  });

  it("resets the opposite level selection when switching mode", () => {
    const values = {
      ...defaultSearchBarFilterValues(),
      selectedLevel: ["Beginner"],
      maxLevelValue: 20,
    };
    expect(changeLevelMode(values, "max")).toMatchObject({ selectedLevel: [], inputLevel: "" });
    expect(changeLevelMode(values, "selected").maxLevelValue).toBeNull();
  });

  it("clears selected figures when switching to filtering for choreographies without figures", () => {
    const values = { ...defaultSearchBarFilterValues(), selectedFigures: ["Mambo"] };
    expect(changeWithoutStepFigures(values, true).selectedFigures).toEqual([]);
    expect(changeWithoutStepFigures(values, false).selectedFigures).toEqual(["Mambo"]);
  });
});
