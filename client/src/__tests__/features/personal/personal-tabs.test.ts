import { describe, expect, it } from "vitest";

import { LEARNING_STATUS_OPTIONS } from "../../../features/choreographies";
import { buildPersonalTabs, isSearchableTab } from "../../../features/personal/model/personal-tabs";

describe("buildPersonalTabs", () => {
  it("builds one tab per status plus the practice tabs, with their counts", () => {
    const tabs = buildPersonalTabs(LEARNING_STATUS_OPTIONS, {
      wishlist: 3,
      learned: null,
      practice: 2,
    });

    expect(tabs.map((tab) => [tab.id, tab.label, tab.emoji, tab.count])).toEqual([
      ["wishlist", "Wishlist", "🤍", 3],
      ["learned", "Learned", "✅", null],
      ["practice", "Practice", "🔁", 2],
      ["log", "Practice log", "📓", null],
      ["dashboard", "Dashboard", "📊", null],
    ]);
    expect(tabs[0].emptyMessage).toMatch(/wishlist is empty/i);
  });

  it("offers the search for every tab but the dashboard", () => {
    expect(
      ["wishlist", "learned", "practice", "log"].map((id) => isSearchableTab(id as never)),
    ).toEqual([true, true, true, true]);
    expect(isSearchableTab("dashboard")).toBe(false);
  });
});
