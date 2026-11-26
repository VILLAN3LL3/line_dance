import { describe, expect, it } from "vitest";

import {
  formatMonth,
  formatShare,
  toBars,
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
