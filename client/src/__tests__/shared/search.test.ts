import { describe, expect, it } from "vitest";

import { matchesName } from "../../shared/utils/search";

describe("matchesName", () => {
  it("matches parts of the name regardless of case and surrounding spaces", () => {
    expect(matchesName("Cowboy Boogie", " BOOG ")).toBe(true);
    expect(matchesName("Cowboy Boogie", "waltz")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesName("Cowboy Boogie", "")).toBe(true);
    expect(matchesName("Cowboy Boogie", "   ")).toBe(true);
  });
});
