import { describe, expect, it } from "vitest";

import { buildChoreographyClipboardText } from "../../utils/choreographyClipboard";

import type { Choreography } from "../../types";
function makeChoreography(overrides: Partial<Choreography> = {}): Choreography {
  return {
    id: 1,
    name: "Bohemian Rhapsody",
    level: "Intermediate",
    count: 64,
    wall_count: 2,
    creation_year: 2025,
    step_sheet_link: "https://example.com/step-sheet",
    demo_video_url: "https://example.com/demo",
    tutorial_video_url: "https://example.com/tutorial",
    song: "Bohemian Rhapsody",
    artist: "Queen",
    authors: ["Alice", "Bob"],
    tags: ["Classic", "Showcase"],
    step_figures: ["Vine", "Rock Step"],
    restart_information: "Restart after wall 3",
    tag_information: "Tag after chorus",
    rating: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildChoreographyClipboardText", () => {
  it("formats full choreography details with section headers", () => {
    const text = buildChoreographyClipboardText(makeChoreography());

    expect(text).toContain("Bohemian Rhapsody (2025)");
    expect(text).toContain("Level: Intermediate");
    expect(text).toContain("Count / Wall: 64 / 2");
    expect(text).toContain("Music:");
    expect(text).toContain("• Song: Bohemian Rhapsody");
    expect(text).toContain("• Artist: Queen");
    expect(text).toContain(
      "• YouTube Search: https://www.youtube.com/results?search_query=Queen+Bohemian+Rhapsody",
    );
    expect(text).toContain(
      "• Spotify Search: https://open.spotify.com/search/Queen+Bohemian+Rhapsody",
    );
    expect(text).toContain("Choreographers:");
    expect(text).toContain("• Alice");
    expect(text).toContain("Step Figures:");
    expect(text).toContain("• Vine");
    expect(text).toContain("Sequence Notes:");
    expect(text).toContain("• Restart Information: Restart after wall 3");
    expect(text).toContain("• Tag Information: Tag after chorus");
    expect(text).toContain("Tags:");
    expect(text).toContain("• Classic");
    expect(text).toContain("Links:");
    expect(text).toContain("• Step Sheet: https://example.com/step-sheet");
  });

  it("omits optional sections when fields are empty", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({
        creation_year: undefined,
        count: undefined,
        wall_count: undefined,
        authors: [],
        step_figures: [],
        tags: [],
        restart_information: undefined,
        tag_information: undefined,
        step_sheet_link: undefined,
        demo_video_url: undefined,
        tutorial_video_url: undefined,
        song: undefined,
        artist: undefined,
      }),
    );

    expect(text).toContain("Bohemian Rhapsody");
    expect(text).toContain("Level: Intermediate");
    expect(text).not.toContain("Count / Wall:");
    expect(text).not.toContain("Music:");
    expect(text).not.toContain("Choreographers:");
    expect(text).not.toContain("Step Figures:");
    expect(text).not.toContain("Sequence Notes:");
    expect(text).not.toContain("Tags:");
    expect(text).not.toContain("Links:");
  });
});
