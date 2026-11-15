import { describe, expect, it } from "vitest";

import {
  buildAuthorSearchPath,
  filterAndSortAuthors,
  getAriaSort,
  levelNamesByValue,
  nextSort,
  toggleInSet,
} from "../../../features/choreographers/model/author-stats";
import {
  addComponentByName,
  buildFigureIndex,
  draftFromFigure,
  getComponentOptions,
  removeComponentByName,
  resolveSelectedFigure,
  sortCatalog,
  toComponentNames,
} from "../../../features/step-figures/model/step-figure-hierarchy";

import type { AuthorStats, StepFigureDefinition } from "../../../types";

const stats: AuthorStats[] = [
  { name: "Alice", total: 3, by_level: { Beginner: 2, Advanced: 1 } },
  { name: "Bob", total: 1, by_level: { Beginner: 1 } },
  { name: "Charlie", total: 2, by_level: { Advanced: 2 } },
];

describe("author-stats model", () => {
  it("filters by name and active levels, then sorts", () => {
    const sort = { field: "total" as const, dir: "desc" as const };
    expect(filterAndSortAuthors(stats, "", new Set(), sort).map((r) => r.name)).toEqual([
      "Alice",
      "Charlie",
      "Bob",
    ]);
    expect(filterAndSortAuthors(stats, " AL ", new Set(), sort).map((r) => r.name)).toEqual([
      "Alice",
    ]);
    expect(
      filterAndSortAuthors(stats, "", new Set(["Advanced"]), { field: "name", dir: "asc" }).map(
        (r) => r.name,
      ),
    ).toEqual(["Alice", "Charlie"]);
  });

  it("starts sorting by name ascending and by total descending", () => {
    const current = { field: "total" as const, dir: "desc" as const };
    expect(nextSort(current, "name")).toEqual({ field: "name", dir: "asc" });
    expect(nextSort(current, "total")).toEqual({ field: "total", dir: "asc" });
    expect(getAriaSort(current, "total")).toBe("descending");
    expect(getAriaSort(current, "name")).toBe("none");
  });

  it("orders level names by value and toggles set members immutably", () => {
    expect(
      levelNamesByValue([
        { id: 2, name: "Advanced", value: 40 },
        { id: 1, name: "Beginner", value: 10 },
      ]),
    ).toEqual(["Beginner", "Advanced"]);
    const set = new Set(["a"]);
    expect([...toggleInSet(set, "b")]).toEqual(["a", "b"]);
    expect([...toggleInSet(set, "a")]).toEqual([]);
    expect([...set]).toEqual(["a"]);
  });

  it("builds the search page link for an author and level", () => {
    expect(buildAuthorSearchPath("Alice")).toBe(
      "/?filters=" + encodeURIComponent(JSON.stringify({ authors: ["Alice"] })),
    );
    expect(buildAuthorSearchPath("Alice", "Beginner")).toContain(
      encodeURIComponent('"level":["Beginner"]'),
    );
  });
});

const figure = (
  id: number,
  name: string,
  used = 0,
  components: { id: number; name: string }[] = [],
): StepFigureDefinition => ({
  id,
  name,
  components,
  parents: [],
  used_by_choreography_count: used,
});

describe("step-figure-hierarchy model", () => {
  const figures = [
    figure(1, "Rock Step", 2),
    figure(2, "Weave", 5),
    figure(3, "Combo", 0, [{ id: 1, name: "Rock Step" }]),
  ];
  const index = buildFigureIndex(figures);

  it("sorts the catalog by usage, then name", () => {
    expect(sortCatalog(figures).map((f) => f.name)).toEqual(["Weave", "Rock Step", "Combo"]);
  });

  it("offers components that are not chosen and not the figure itself", () => {
    expect(getComponentOptions(sortCatalog(figures), [1], 3)).toEqual(["Weave"]);
  });

  it("adds components by name, ignoring unknown, duplicate and self references", () => {
    expect(addComponentByName([], " weave ", index)).toEqual([2]);
    expect(addComponentByName([2], "Weave", index)).toEqual([2]);
    expect(addComponentByName([], "Unknown", index)).toEqual([]);
    expect(addComponentByName([], "Combo", index, 3)).toEqual([]);
    expect(removeComponentByName([1, 2], "rock step", index)).toEqual([2]);
    expect(toComponentNames([2, 99, 1], index)).toEqual(["Weave", "Rock Step"]);
  });

  it("keeps the selection while it exists, otherwise falls back to the first figure", () => {
    expect(resolveSelectedFigure(figures, 2)?.id).toBe(2);
    expect(resolveSelectedFigure(figures, 99)?.id).toBe(1);
    expect(resolveSelectedFigure([], null)).toBeNull();
  });

  it("creates drafts from a figure", () => {
    expect(draftFromFigure(figures[2])).toEqual({
      name: "Combo",
      componentInput: "",
      componentIds: [1],
    });
    expect(draftFromFigure(null).name).toBe("");
  });
});
