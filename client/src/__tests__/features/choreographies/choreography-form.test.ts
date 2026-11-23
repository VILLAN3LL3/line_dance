import { describe, expect, it } from "vitest";

import {
  addListItem,
  applyFieldChange,
  clearInformationRowErrors,
  createInitialFormData,
  ensureEmptyInformationRow,
  getNextTabIndex,
  getTabErrors,
  isPendingKnownOption,
  mapFieldIssues,
  removeInformationRow,
  removeListItem,
  toSubmittedFormData,
  updateInformationRow,
} from "../../../features/choreographies/model/choreography-form";

import type { ChoreographyFormData } from "../../../types";

const base = (overrides: Partial<ChoreographyFormData> = {}): ChoreographyFormData => ({
  name: "",
  level: "",
  authors: [],
  tags: [],
  step_figures: [],
  choreography_information: [],
  ...overrides,
});

describe("choreography-form model", () => {
  it("starts with one empty information row and assigns ids to existing rows", () => {
    const empty = createInitialFormData();
    expect(empty.choreography_information).toHaveLength(1);
    expect(empty.choreography_information?.[0]).toMatchObject({ category: "", description: "" });

    const loaded = createInitialFormData(
      base({ choreography_information: [{ category: "tag", description: "x" }] }),
    );
    expect(loaded.choreography_information).toHaveLength(2);
    expect(loaded.choreography_information?.[0].id).toBeDefined();
  });

  it("keeps exactly one trailing empty information row", () => {
    const filled = [{ id: "1", category: "tag", description: "" }];
    expect(ensureEmptyInformationRow(filled)).toHaveLength(2);
    const withEmpty = [...filled, { id: "2", category: "", description: " " }];
    expect(ensureEmptyInformationRow(withEmpty)).toBe(withEmpty);
  });

  it("appends a new empty row when the last row gets content", () => {
    const data = base({ choreography_information: [{ id: "1", category: "", description: "" }] });
    const updated = updateInformationRow(data, 0, "category", "tag");
    expect(updated.choreography_information).toHaveLength(2);
    expect(updated.choreography_information?.[0].category).toBe("tag");

    const notLast = updateInformationRow(updated, 0, "description", "more");
    expect(notLast.choreography_information).toHaveLength(2);
  });

  it("removes a row and keeps the trailing empty row", () => {
    const data = base({
      choreography_information: [
        { id: "1", category: "tag", description: "a" },
        { id: "2", category: "", description: "" },
      ],
    });
    const result = removeInformationRow(data, 0);
    expect(result.choreography_information).toHaveLength(1);
    expect(result.choreography_information?.[0].id).toBe("2");
  });

  it("parses numeric fields and leaves cleared numbers undefined", () => {
    expect(applyFieldChange(base(), "count", "32").count).toBe(32);
    expect(applyFieldChange(base({ count: 5 }), "count", "").count).toBeUndefined();
    expect(applyFieldChange(base(), "name", "Waltz").name).toBe("Waltz");
    expect(applyFieldChange(base(), "is_fun", "on", true)).toMatchObject({ is_fun: true });
  });

  it("adds list items with canonical spelling and ignores duplicates", () => {
    const withAuthor = addListItem(base(), "authors", " alice ", ["Alice"]);
    expect(withAuthor.authors).toEqual(["Alice"]);
    expect(addListItem(withAuthor, "authors", "ALICE", ["Alice"])).toBe(withAuthor);
    expect(addListItem(base(), "tags", "   ", [])).toEqual(base());
    expect(removeListItem(withAuthor, "authors", "Alice").authors).toEqual([]);
  });

  it("detects known options that are not selected yet", () => {
    expect(isPendingKnownOption("alice", ["Alice"], [])).toBe(true);
    expect(isPendingKnownOption("alice", ["Alice"], ["Alice"])).toBe(false);
    expect(isPendingKnownOption("bob", ["Alice"], [])).toBe(false);
    expect(isPendingKnownOption("  ", ["Alice"], [])).toBe(false);
  });

  it("maps issue keys to messages and addresses information rows by id", () => {
    const data = base({
      choreography_information: [{ id: "row-1", category: "", description: "" }],
    });
    const { fieldErrors, hasUnmappedIssue } = mapFieldIssues(
      [
        { field: "name", key: "required" },
        { field: "choreography_information.0.category", key: "required" },
      ],
      data,
    );
    expect(fieldErrors).toEqual({
      name: "Enter a choreography name.",
      "choreography_information.row-1.category": "Choose or enter a category.",
    });
    expect(hasUnmappedIssue).toBe(false);
  });

  it("flags unknown issues and rows that cannot be addressed", () => {
    expect(mapFieldIssues([{ field: "name", key: "weird" }], base()).hasUnmappedIssue).toBe(true);
    expect(
      mapFieldIssues([{ field: "choreography_information.3.category", key: "required" }], base())
        .hasUnmappedIssue,
    ).toBe(true);
  });

  it("derives tab error badges from field errors", () => {
    const errors = getTabErrors({
      name: "x",
      demo_video_url: "y",
      "choreography_information.1.description": "z",
    });
    expect(errors).toMatchObject({
      "basic-information": true,
      links: true,
      "additional-information": true,
      "hash-tags": false,
    });
    expect(
      clearInformationRowErrors({ "choreography_information.1.category": "x", name: "y" }, "1"),
    ).toEqual({ name: "y" });
  });

  it("strips row ids before submitting", () => {
    const submitted = toSubmittedFormData(
      base({ choreography_information: [{ id: "1", category: "tag", description: "a" }] }),
    );
    expect(submitted.choreography_information).toEqual([{ category: "tag", description: "a" }]);
  });

  it("starts with one empty song row and loads saved songs followed by an empty row", () => {
    expect(createInitialFormData().choreography_songs).toHaveLength(1);
    const loaded = createInitialFormData(
      base({ choreography_songs: [{ id: 4, title: "A", is_favorite: true }] }),
    );
    expect(loaded.choreography_songs).toHaveLength(2);
    expect(loaded.choreography_songs?.[0]).toMatchObject({ id: 4, title: "A", is_favorite: true });
  });

  it("submits saved song ids but not placeholder ids", () => {
    const submitted = toSubmittedFormData(
      base({
        choreography_songs: [
          { id: 4, title: "A" },
          { id: "uuid", title: "B" },
        ],
      }),
    );
    expect(submitted.choreography_songs).toEqual([{ id: 4, title: "A" }, { title: "B" }]);
  });

  it("maps song issues to rows by id and the tab error badge", () => {
    const data = base({
      choreography_songs: [
        { id: "row-1", title: "" },
        { id: 7, title: "B", youtube_url: "nope" },
      ],
    });
    const { fieldErrors, hasUnmappedIssue } = mapFieldIssues(
      [
        { field: "choreography_songs.0.title", key: "required" },
        { field: "choreography_songs.1.youtube_url", key: "invalid_url" },
        { field: "choreography_songs", key: "invalid_songs" },
      ],
      data,
    );
    expect(fieldErrors).toEqual({
      "choreography_songs.row-1.title": "Enter a song title.",
      "choreography_songs.7.youtube_url": "Enter a valid http(s) link.",
      choreography_songs: "Check the songs: only one can be the favorite.",
    });
    expect(hasUnmappedIssue).toBe(false);
    expect(getTabErrors(fieldErrors).songs).toBe(true);
    expect(getTabErrors({ name: "x" }).songs).toBe(false);
  });

  it("flags song rows that cannot be addressed", () => {
    expect(
      mapFieldIssues([{ field: "choreography_songs.5.title", key: "required" }], base())
        .hasUnmappedIssue,
    ).toBe(true);
  });

  it("navigates tabs with arrow keys, wrapping around", () => {
    expect(getNextTabIndex("ArrowRight", 5, 6)).toBe(0);
    expect(getNextTabIndex("ArrowLeft", 0, 6)).toBe(5);
    expect(getNextTabIndex("Home", 3, 6)).toBe(0);
    expect(getNextTabIndex("End", 3, 6)).toBe(5);
    expect(getNextTabIndex("Enter", 3, 6)).toBeNull();
  });
});
