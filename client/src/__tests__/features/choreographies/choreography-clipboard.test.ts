import { describe, expect, it } from "vitest";

import {
  buildChoreographyClipboardText,
  formatAuthorForClipboard,
} from "../../../features/choreographies/model/choreography-clipboard";

import type { Choreography } from "../../../types";
function makeChoreography(overrides: Partial<Choreography> = {}): Choreography {
  return {
    id: 1,
    name: "Bohemian Rhapsody",
    level: "Intermediate",
    official_level: "Intermediate",
    personal_level: null,
    count: 64,
    wall_count: 2,
    creation_year: 2025,
    step_sheet_link: "https://example.com/step-sheet",
    demo_video_url: "https://example.com/demo",
    tutorial_video_url: "https://example.com/tutorial",
    choreography_songs: [
      { id: 1, title: "Bohemian Rhapsody", artist: "Queen", is_favorite: false },
    ],
    authors: ["Alice", "Bob"],
    tags: ["Classic", "Showcase"],
    step_figures: ["Vine", "Rock Step"],
    choreography_information: [
      { id: 1, category: "Restart", description: "Restart after wall 3" },
      { id: 2, category: "Tag", description: "Tag after chorus" },
    ],
    rating: null,
    learning_status: null,
    learning_status_date: null,
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
    expect(text).toContain("Choreography Information:");
    expect(text).toContain("• Restart: Restart after wall 3");
    expect(text).toContain("• Tag: Tag after chorus");
    expect(text).toContain("Tags:");
    expect(text).toContain("• Classic");
    expect(text).toContain("Links:");
    expect(text).toContain("• Step Sheet: https://example.com/step-sheet");
  });

  it("lists the favorite first, then alternatives with notes and stored links", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({
        choreography_songs: [
          { id: 1, title: "Remix", artist: "DJ", note: "faster", is_favorite: false },
          {
            id: 2,
            title: "Original",
            artist: "Queen",
            youtube_url: "https://youtu.be/1",
            is_favorite: true,
          },
        ],
      }),
    );

    expect(text).toContain("Music:\n• Song: Original\n• Artist: Queen");
    expect(text).toContain("• YouTube: https://youtu.be/1");
    expect(text).toContain("• Spotify Search: https://open.spotify.com/search/Queen+Original");
    expect(text).toContain("Alternative songs:\n• DJ - Remix (faster)");
    expect(text).toContain("  • YouTube: https://www.youtube.com/results?search_query=DJ+Remix");
  });

  it("shares a song with a stored link but without an artist", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({
        choreography_songs: [
          { id: 1, title: "Solo", spotify_url: "https://open.spotify.com/x", is_favorite: false },
        ],
      }),
    );

    expect(text).toContain("• Song: Solo");
    expect(text).not.toContain("• Artist:");
    expect(text).toContain("• Spotify: https://open.spotify.com/x");
    expect(text).not.toContain("YouTube");
  });

  it("shares tempo, genre and length of the songs", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({
        choreography_songs: [
          {
            id: 1,
            title: "Original",
            artist: "Queen",
            bpm: 120,
            genre: "Rock",
            length_seconds: 225,
            is_favorite: true,
          },
          { id: 2, title: "Remix", artist: "DJ", bpm: 140, is_favorite: false },
          { id: 3, title: "Plain", is_favorite: false },
        ],
      }),
    );

    expect(text).toContain("• Details: 120 BPM · Rock · 3:45");
    expect(text).toContain("• DJ - Remix – 140 BPM");
    expect(text).toContain("• Plain\n");
  });

  it("shares the official level instead of the effective personal level", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({ level: "Advanced", personal_level: "Advanced" }),
    );

    expect(text).toContain("Level: Intermediate");
    expect(text).not.toContain("Advanced");
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
        choreography_information: [],
        step_sheet_link: undefined,
        demo_video_url: undefined,
        tutorial_video_url: undefined,
        choreography_songs: [],
      }),
    );

    expect(text).toContain("Bohemian Rhapsody");
    expect(text).toContain("Level: Intermediate");
    expect(text).not.toContain("Count / Wall:");
    expect(text).not.toContain("Music:");
    expect(text).not.toContain("Choreographers:");
    expect(text).not.toContain("Step Figures:");
    expect(text).not.toContain("Choreography Information:");
    expect(text).not.toContain("Tags:");
    expect(text).not.toContain("Links:");
  });

  it("replaces ISO 2-char country code in author name with full country name", () => {
    const countryCodes = { DE: "Germany", CH: "Switzerland" };
    const text = buildChoreographyClipboardText(
      makeChoreography({ authors: ["Bettina Haag (DE)", "Jo Smith (CH)"] }),
      countryCodes,
    );
    expect(text).toContain("• Bettina Haag (Germany)");
    expect(text).toContain("• Jo Smith (Switzerland)");
    expect(text).not.toContain("(DE)");
    expect(text).not.toContain("(CH)");
  });

  it("leaves author unchanged when country code is not in the map", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({ authors: ["Bettina Haag (DE)"] }),
      {},
    );
    expect(text).toContain("• Bettina Haag (DE)");
  });

  it("leaves author unchanged when no country code suffix is present", () => {
    const countryCodes = { DE: "Germany" };
    const text = buildChoreographyClipboardText(
      makeChoreography({ authors: ["Bettina Haag"] }),
      countryCodes,
    );
    expect(text).toContain("• Bettina Haag");
  });

  it("uses empty country map by default (no substitution)", () => {
    const text = buildChoreographyClipboardText(
      makeChoreography({ authors: ["Bettina Haag (DE)"] }),
    );
    expect(text).toContain("• Bettina Haag (DE)");
  });
});

describe("formatAuthorForClipboard", () => {
  const countryCodes = { DE: "Germany", CH: "Switzerland", AUT: "Austria" };

  it("replaces 2-char ISO code with country name", () => {
    expect(formatAuthorForClipboard("Bettina Haag (DE)", countryCodes)).toBe(
      "Bettina Haag (Germany)",
    );
  });

  it("replaces 3-char ISO code with country name", () => {
    expect(formatAuthorForClipboard("Hans Muster (AUT)", countryCodes)).toBe(
      "Hans Muster (Austria)",
    );
  });

  it("returns original string when code is not in map", () => {
    expect(formatAuthorForClipboard("John Doe (US)", countryCodes)).toBe("John Doe (US)");
  });

  it("returns original string when no country code suffix", () => {
    expect(formatAuthorForClipboard("Bettina Haag", countryCodes)).toBe("Bettina Haag");
  });

  it("returns original string for empty input", () => {
    expect(formatAuthorForClipboard("", countryCodes)).toBe("");
  });
});
