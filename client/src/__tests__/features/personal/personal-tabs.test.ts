import { describe, expect, it } from "vitest";

import { LEARNING_STATUS_OPTIONS } from "../../../features/choreographies";
import { buildPersonalTabs } from "../../../features/personal/model/personal-tabs";

describe("buildPersonalTabs", () => {
  it("builds one tab per status with its count and empty message", () => {
    const tabs = buildPersonalTabs(LEARNING_STATUS_OPTIONS, { wishlist: 3, learned: null });

    expect(tabs.map((tab) => [tab.status, tab.label, tab.emoji, tab.count])).toEqual([
      ["wishlist", "Wishlist", "🤍", 3],
      ["learned", "Learned", "✅", null],
    ]);
    expect(tabs[0].emptyMessage).toMatch(/wishlist is empty/i);
  });
});
