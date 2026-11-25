import { describe, expect, it } from "vitest";

import {
  buildPracticeDeck,
  filterDeckByName,
  describeLastPractice,
  describeNextDue,
  describePracticeCount,
  getMemoryAids,
} from "../../../features/practice/model/practice-deck";
import {
  buildLogRequest,
  filterByName,
  formatLocalDate,
  groupLogByDay,
  toggleSelection,
} from "../../../features/practice/model/practice-log";
import { buildStepOptions } from "../../../features/practice/model/practice-steps";
import {
  createQuickLogState,
  describeSaved,
  describeSubmit,
  quickLogReducer,
} from "../../../features/practice/model/quick-log";
import type { PracticeLogEntry } from "../../../types";
import { makeDance, makeSummary } from "./testData";

describe("buildPracticeDeck", () => {
  it("splits due and later dances and keeps the server order", () => {
    const dances = [makeDance(1, "A"), makeDance(2, "B"), makeDance(3, "C")];
    const deck = buildPracticeDeck(dances, [
      makeSummary(3, {
        practice_count: 1,
        last_practiced_on: "2026-01-01",
        next_due_on: "2026-01-02",
      }),
      makeSummary(1, { is_due: false, next_due_on: "2999-01-01", practice_count: 2 }),
      makeSummary(2),
    ]);
    expect(deck.due.map((card) => card.choreography.id)).toEqual([3, 2]);
    expect(deck.later.map((card) => card.choreography.id)).toEqual([1]);
  });

  it("puts a learned dance without server summary first as never practiced", () => {
    const deck = buildPracticeDeck(
      [makeDance(1, "A"), makeDance(2, "New")],
      [makeSummary(1, { practice_count: 1 })],
    );
    expect(deck.due[0].choreography.id).toBe(2);
    expect(deck.due[0].summary).toMatchObject({ practice_count: 0, is_due: true });
  });

  it("ignores summaries of dances that are no longer learned", () => {
    const deck = buildPracticeDeck([makeDance(1, "A")], [makeSummary(1), makeSummary(9)]);
    expect([...deck.due, ...deck.later]).toHaveLength(1);
  });
});

describe("filterDeckByName", () => {
  it("filters due and later cards by the dance name", () => {
    const deck = buildPracticeDeck(
      [makeDance(1, "Cowboy Boogie"), makeDance(2, "Cowgirl Waltz"), makeDance(3, "Other")],
      [
        makeSummary(1),
        makeSummary(2, { is_due: false, next_due_on: "2999-01-01" }),
        makeSummary(3),
      ],
    );
    const filtered = filterDeckByName(deck, "cow");
    expect(filtered.due.map((card) => card.choreography.id)).toEqual([1]);
    expect(filtered.later.map((card) => card.choreography.id)).toEqual([2]);
    expect(filterDeckByName(deck, "")).toEqual(deck);
  });
});

describe("practice descriptions", () => {
  it("describes the state of a dance", () => {
    expect(describeLastPractice(makeSummary(1))).toBe("Not practiced yet");
    expect(describeLastPractice(makeSummary(1, { last_practiced_on: "2026-11-10" }))).toBe(
      "2026-11-10",
    );
    expect([0, 1, 4].map(describePracticeCount)).toEqual(["Never", "Once", "4 times"]);
    expect(describeNextDue(makeSummary(1))).toBe("Due now");
    expect(
      describeNextDue(
        makeSummary(1, { next_due_on: "2026-11-30", is_due: false, days_overdue: -3 }),
      ),
    ).toBe("Due 2026-11-30");
    expect(describeNextDue(makeSummary(1, { next_due_on: "2026-11-24", days_overdue: 0 }))).toBe(
      "Due today",
    );
    expect(describeNextDue(makeSummary(1, { next_due_on: "2026-11-20", days_overdue: 4 }))).toBe(
      "Overdue since 2026-11-20",
    );
  });
});

describe("getMemoryAids", () => {
  it("lists restarts and tags first and drops blank descriptions", () => {
    const dance = makeDance(1, "A", {
      choreography_information: [
        { category: "Ending", description: "Hold the pose" },
        { category: "Tag", description: "after wall 2" },
        { category: "Intro", description: "   " },
        { category: "Restart", description: "wall 4" },
      ],
    });
    expect(getMemoryAids(dance).map((aid) => aid.category)).toEqual(["Restart", "Tag", "Ending"]);
    expect(getMemoryAids(makeDance(2, "B"))).toEqual([]);
  });
});

describe("practice log model", () => {
  it("formats local dates", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("builds a request without empty optional fields", () => {
    expect(
      buildLogRequest({ choreographyIds: [1], practicedOn: "", confidence: "sure", note: "  " }),
    ).toEqual({ choreography_ids: [1], confidence: "sure" });
    expect(
      buildLogRequest({
        choreographyIds: [1],
        practicedOn: "2026-11-01",
        confidence: "unsure",
        note: " restart ",
        songId: 7,
      }),
    ).toEqual({
      choreography_ids: [1],
      practiced_on: "2026-11-01",
      confidence: "unsure",
      song_id: 7,
      note: "restart",
    });
  });

  it("groups entries by day in server order", () => {
    const entry = (id: number, day: string): PracticeLogEntry => ({
      id,
      choreography_id: id,
      choreography_name: `D${id}`,
      practiced_on: day,
      confidence: "sure",
      note: null,
      song_id: null,
      song_title: null,
      step: null,
    });
    const days = groupLogByDay([
      entry(1, "2026-11-02"),
      entry(2, "2026-11-02"),
      entry(3, "2026-11-01"),
    ]);
    expect(days.map((day) => [day.date, day.entries.length])).toEqual([
      ["2026-11-02", 2],
      ["2026-11-01", 1],
    ]);
  });

  it("toggles selections and filters dances by name", () => {
    expect(toggleSelection([1, 2], 2)).toEqual([1]);
    expect(toggleSelection([1], 2)).toEqual([1, 2]);
    const dances = [makeDance(1, "Cowboy Boogie"), makeDance(2, "Waltz")];
    expect(filterByName(dances, " BOOG ").map((dance) => dance.id)).toEqual([1]);
    expect(filterByName(dances, "")).toHaveLength(2);
  });
});

describe("quickLogReducer", () => {
  it("collects the form input and resets it after saving", () => {
    let state = createQuickLogState("2026-11-24");
    state = quickLogReducer(state, { type: "toggle-open" });
    state = quickLogReducer(state, { type: "toggle-dance", id: 3 });
    state = quickLogReducer(state, { type: "set-date", practicedOn: "2026-11-20" });
    state = quickLogReducer(state, { type: "set-confidence", confidence: "unsure" });
    state = quickLogReducer(state, { type: "set-note", note: "n" });
    expect(state).toMatchObject({
      open: true,
      selected: [3],
      practicedOn: "2026-11-20",
      confidence: "unsure",
      note: "n",
    });
    expect(quickLogReducer(state, { type: "saved", today: "2026-11-25" })).toEqual({
      ...createQuickLogState("2026-11-25"),
      open: true,
    });
  });
});

describe("buildStepOptions", () => {
  it("describes each step with the range of days over all level tiers", () => {
    const options = buildStepOptions([
      { name: "Beginner", max_level_value: 40, interval_days: [1, 4, 182] },
      { name: "Advanced", max_level_value: null, interval_days: [1, 2, 182] },
    ]);
    expect(options).toEqual([
      { step: 1, label: "Step 1 · due again after 1 day" },
      { step: 2, label: "Step 2 · due again after 2–4 days" },
      { step: 3, label: "Step 3 · due again after 182 days" },
    ]);
    expect(buildStepOptions([])).toEqual([]);
  });
});

describe("quick log baseline mode", () => {
  it("selects all shown dances without duplicates and clears the selection", () => {
    let state = createQuickLogState("2026-11-24");
    state = quickLogReducer(state, { type: "toggle-dance", id: 2 });
    state = quickLogReducer(state, { type: "select-all", ids: [1, 2, 3] });
    expect(state.selected).toEqual([2, 1, 3]);
    expect(quickLogReducer(state, { type: "clear-selection" }).selected).toEqual([]);
  });

  it("keeps mode and step after saving", () => {
    let state = createQuickLogState("2026-11-24");
    state = quickLogReducer(state, { type: "set-mode", mode: "baseline" });
    state = quickLogReducer(state, { type: "set-step", step: 9 });
    state = quickLogReducer(state, { type: "toggle-dance", id: 1 });
    expect(quickLogReducer(state, { type: "saved", today: "2026-11-25" })).toMatchObject({
      mode: "baseline",
      step: 9,
      selected: [],
    });
  });

  it("describes the submit button and the saved message per mode", () => {
    expect([0, 1, 3].map((count) => describeSubmit("practice", count))).toEqual([
      "Log practice",
      "Log 1 dance",
      "Log 3 dances",
    ]);
    expect([0, 1, 3].map((count) => describeSubmit("baseline", count))).toEqual([
      "Set interval step",
      "Set step for 1 dance",
      "Set step for 3 dances",
    ]);
    expect(describeSaved("practice", 2, 6)).toBe("Logged 2 dances");
    expect(describeSaved("baseline", 1, 8)).toBe("Set 1 dance to step 8");
  });
});
