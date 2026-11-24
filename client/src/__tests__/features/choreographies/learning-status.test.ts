import { describe, expect, it } from "vitest";

import {
  describeLearningStatus,
  getLearningStatusOption,
  toggleLearningStatus,
} from "../../../features/choreographies/model/learning-status";

describe("learning status model", () => {
  it("maps each status to its emoji and label", () => {
    expect(getLearningStatusOption("wishlist")).toMatchObject({ emoji: "🤍", label: "Wishlist" });
    expect(getLearningStatusOption("learned")).toMatchObject({ emoji: "✅", label: "Learned" });
    expect(getLearningStatusOption(null)).toBeNull();
  });

  it("clears the status when the active one is clicked again", () => {
    expect(toggleLearningStatus("wishlist", "wishlist")).toBeNull();
    expect(toggleLearningStatus("wishlist", "learned")).toBe("learned");
    expect(toggleLearningStatus(null, "wishlist")).toBe("wishlist");
  });

  it("describes the status with its date when one exists", () => {
    expect(describeLearningStatus("learned", "2026-11-24")).toBe("Learned since 2026-11-24");
    expect(describeLearningStatus("wishlist", null)).toBe("Wishlist");
  });
});
