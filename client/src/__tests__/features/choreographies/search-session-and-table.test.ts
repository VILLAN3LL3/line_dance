import { describe, expect, it } from "vitest";

import {
  collectInformationCategories,
  nextSort,
  sortChoreographies,
} from "../../../features/choreographies/model/choreography-table";
import {
  areFiltersEqual,
  parseDisplayMode,
  parseFiltersParam,
  resolveInitialFilters,
} from "../../../features/choreographies/model/search-session";

import type { Choreography } from "../../../types";

const choreo = (overrides: Partial<Choreography>): Choreography =>
  ({
    id: 1,
    name: "A",
    level: "Beginner",
    choreography_information: [],
    ...overrides,
  }) as Choreography;

describe("search-session model", () => {
  it("falls back to card display mode for unknown values", () => {
    expect(parseDisplayMode("table")).toBe("table");
    expect(parseDisplayMode("grid")).toBe("card");
    expect(parseDisplayMode(null)).toBe("card");
  });

  it("ignores malformed filter params", () => {
    expect(parseFiltersParam('{"search":"a"}')).toEqual({ search: "a" });
    expect(parseFiltersParam("{oops")).toBeUndefined();
    expect(parseFiltersParam(null)).toBeUndefined();
  });

  it("prefers router state over the URL param over stored filters", () => {
    const routeFilters = { search: "route" };
    const urlFilters = { search: "url" };
    const storedFilters = { search: "stored" };
    expect(resolveInitialFilters({ routeFilters, urlFilters, storedFilters })).toBe(routeFilters);
    expect(resolveInitialFilters({ urlFilters, storedFilters })).toBe(urlFilters);
    expect(resolveInitialFilters({ storedFilters })).toBe(storedFilters);
    expect(resolveInitialFilters({})).toEqual({});
  });

  it("compares filters by content", () => {
    expect(areFiltersEqual({ search: "a" }, { search: "a" })).toBe(true);
    expect(areFiltersEqual({ search: "a" }, { search: "b" })).toBe(false);
  });
});

describe("choreography-table model", () => {
  it("sorts by name in both directions without mutating the input", () => {
    const items = [choreo({ id: 1, name: "B" }), choreo({ id: 2, name: "A" })];
    expect(sortChoreographies(items, "name", "asc").map((c) => c.name)).toEqual(["A", "B"]);
    expect(sortChoreographies(items, "name", "desc").map((c) => c.name)).toEqual(["B", "A"]);
    expect(items[0].name).toBe("B");
  });

  it("sorts missing numbers last when ascending", () => {
    const items = [choreo({ id: 1, count: undefined }), choreo({ id: 2, count: 32 })];
    expect(sortChoreographies(items, "count", "asc").map((c) => c.id)).toEqual([2, 1]);
  });

  it("sorts choreographies having an information category first", () => {
    const withTag = choreo({
      id: 2,
      choreography_information: [{ category: "tag", description: "x" }],
    });
    const result = sortChoreographies([choreo({ id: 1 }), withTag], "information:tag", "asc");
    expect(result.map((c) => c.id)).toEqual([2, 1]);
  });

  it("flips direction on the active column and resets on a new one", () => {
    expect(nextSort({ field: "name", direction: "asc" }, "name")).toEqual({
      field: "name",
      direction: "desc",
    });
    expect(nextSort({ field: "name", direction: "desc" }, "level")).toEqual({
      field: "level",
      direction: "asc",
    });
  });

  it("collects unique sorted information categories", () => {
    const items = [
      choreo({ choreography_information: [{ category: "tag", description: "" }] }),
      choreo({
        choreography_information: [
          { category: "restart", description: "" },
          { category: "tag", description: "" },
        ],
      }),
    ];
    expect(collectInformationCategories(items)).toEqual(["restart", "tag"]);
  });
});
