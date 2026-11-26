import { describe, expect, it } from "vitest";

import {
  DONUT_COLORS,
  OTHER_COLOR,
  UNKNOWN_COLOR,
  donutBackground,
  formatMonth,
  formatShare,
  groupMinorItems,
  toBars,
  toDonutSlices,
  toMonthColumns,
} from "../../../features/statistics/model/dashboard";
import { statistics } from "./testData";

describe("toBars", () => {
  it("scales the bars by the largest count and adds the share", () => {
    const bars = toBars(statistics.levels, 8);
    expect(bars.map((bar) => [bar.label, bar.widthPercent, bar.shareText])).toEqual([
      ["BEGINNER", 100, "75 %"],
      ["IMPROVER", (2 / 6) * 100, "25 %"],
    ]);
  });

  it("keeps empty bars empty and handles no data", () => {
    expect(toBars([{ key: "a", label: "A", count: 0 }], 0)).toEqual([
      { key: "a", label: "A", count: 0, widthPercent: 0, shareText: "0 %" },
    ]);
    expect(toBars([], 0)).toEqual([]);
  });
});

describe("formatShare and formatMonth", () => {
  it("rounds the share and names the month", () => {
    expect(formatShare(1, 3)).toBe("33 %");
    expect(formatShare(2, 3)).toBe("67 %");
    expect(formatMonth("2026-11")).toBe("Nov 2026");
    expect(formatMonth("2026-13")).toBe("2026-13");
  });
});

describe("toMonthColumns", () => {
  it("scales every series by its own maximum and describes the month", () => {
    const [january, february, march] = toMonthColumns(statistics.timeline.months);
    expect(january).toMatchObject({ learnedPercent: 75, practicesPercent: 0, totalPercent: 50 });
    expect(february).toMatchObject({ learnedPercent: 0, practicesPercent: 100, totalPercent: 50 });
    expect(march).toMatchObject({
      learnedPercent: 100,
      practicesPercent: (2 / 6) * 100,
      totalPercent: 100,
    });
    expect(march.description).toBe("Mar 2026: 4 learned, 2 practices, 8 learned in total");
  });

  it("gives no columns without months", () => {
    expect(toMonthColumns([])).toEqual([]);
  });
});

const item = (key: string, count: number) => ({ key, label: key.toUpperCase(), count });

describe("groupMinorItems", () => {
  it("keeps the most frequent items and sums the rest up as Other, unknown stays last", () => {
    const grouped = groupMinorItems(
      [item("a", 5), item("b", 4), item("c", 3), item("d", 2), item("e", 1), item("unknown", 6)],
      3,
    );
    expect(grouped.items.map((entry) => [entry.key, entry.count])).toEqual([
      ["a", 5],
      ["b", 4],
      ["c", 3],
      ["other", 3],
      ["unknown", 6],
    ]);
    expect(grouped.groupedCount).toBe(2);
  });

  it("adds no Other without surplus items and drops items without dances", () => {
    const grouped = groupMinorItems([item("a", 2), item("b", 0), item("unknown", 0)], 3);
    expect(grouped.items.map((entry) => entry.key)).toEqual(["a"]);
    expect(grouped.groupedCount).toBe(0);
  });
});

describe("toDonutSlices", () => {
  it("assigns the colors in order and closes the circle", () => {
    const slices = toDonutSlices([
      item("a", 2),
      item("b", 0),
      item("c", 1),
      item("other", 1),
      item("unknown", 4),
    ]);
    expect(slices.map((slice) => [slice.key, slice.color, slice.shareText])).toEqual([
      ["a", DONUT_COLORS[0], "25 %"],
      ["c", DONUT_COLORS[1], "13 %"],
      ["other", OTHER_COLOR, "13 %"],
      ["unknown", UNKNOWN_COLOR, "50 %"],
    ]);
    expect(slices[0].startPercent).toBe(0);
    expect(slices[1].startPercent).toBe(slices[0].endPercent);
    expect(slices.at(-1)?.endPercent).toBeCloseTo(100);
  });

  it("starts the colors again when there are more slices than colors", () => {
    const many = Array.from({ length: DONUT_COLORS.length + 1 }, (_, index) =>
      item(`k${index}`, 1),
    );
    expect(toDonutSlices(many).at(-1)?.color).toBe(DONUT_COLORS[0]);
  });

  it("has no slices without dances", () => {
    expect(toDonutSlices([item("a", 0)])).toEqual([]);
  });
});

describe("donutBackground", () => {
  it("builds a conic gradient with one segment per slice", () => {
    const background = donutBackground(toDonutSlices([item("a", 1), item("b", 1)]));
    expect(background).toBe(
      `conic-gradient(${DONUT_COLORS[0]} 0% 50%, ${DONUT_COLORS[1]} 50% 100%)`,
    );
  });

  it("is a plain color for an empty donut", () => {
    expect(donutBackground([])).toBe(UNKNOWN_COLOR);
  });
});
