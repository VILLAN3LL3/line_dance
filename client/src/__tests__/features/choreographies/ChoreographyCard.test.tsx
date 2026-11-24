import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, screen, waitFor } from "@testing-library/react";

import {
  deleteChoreographyLearningStatus,
  deleteChoreographyRating,
  setChoreographyLearningStatus,
  setChoreographyRating,
} from "../../../features/choreographies/api";
import { buildChoreographyClipboardText } from "../../../features/choreographies/model/choreography-clipboard";
import { useChoreographyCardViewModel } from "../../../features/choreographies/viewmodels/useChoreographyCardViewModel";
import { ChoreographyCard as ChoreographyCardView } from "../../../features/choreographies/views/ChoreographyCard";
import { renderWithQueryClient as render } from "../../helpers/renderWithQueryClient";

vi.mock("../../../features/choreographies/api", () => ({
  deleteChoreographyLearningStatus: vi.fn().mockResolvedValue(undefined),
  deleteChoreographyRating: vi.fn().mockResolvedValue(undefined),
  setChoreographyLearningStatus: vi.fn().mockResolvedValue(undefined),
  setChoreographyRating: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../features/metadata/api", () => ({
  getCountryCodes: vi.fn().mockResolvedValue({}),
}));

import type { Choreography } from "../../../types";
import type { ComponentProps } from "react";

const ChoreographyCard = (
  props: Omit<ComponentProps<typeof ChoreographyCardView>, "cardViewModel">,
) => {
  const cardViewModel = useChoreographyCardViewModel();
  return <ChoreographyCardView {...props} cardViewModel={cardViewModel} />;
};

function makeChoreography(overrides: Partial<Choreography> = {}): Choreography {
  return {
    id: 42,
    name: "Neon Waltz",
    level: "Intermediate",
    official_level: "Intermediate",
    personal_level: null,
    count: 32,
    wall_count: 4,
    creation_year: 2024,
    step_sheet_link: "https://example.com/step-sheet",
    demo_video_url: "https://example.com/demo",
    tutorial_video_url: "https://example.com/tutorial",
    authors: ["Alice", "Bob"],
    tags: ["smooth", "classic"],
    step_figures: ["Weave", "Rock Step"],
    choreography_information: [
      { id: 1, category: "Restart", description: "Has restart" },
      { id: 2, category: "Tag", description: "Has tag" },
    ],
    rating: null,
    learning_status: null,
    learning_status_date: null,
    choreography_songs: [],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("ChoreographyCard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fades overflowing choreographers until clicked and supports collapsing again", () => {
    const originalGetComputedStyle = globalThis.getComputedStyle;
    vi.spyOn(globalThis, "getComputedStyle").mockImplementation((element) => {
      const style = originalGetComputedStyle(element);
      if (element.classList.contains("authors-text")) {
        Object.defineProperty(style, "lineHeight", { value: "19.5px" });
      }
      return style;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(60);
    const onParentClick = vi.fn();
    const authors = ["Alice", "Bob", "Charlie", "Danielle", "Eleanor"];
    const { container } = render(
      <div onClick={onParentClick}>
        <ChoreographyCard choreography={makeChoreography({ authors })} />
      </div>,
    );

    const text = container.querySelector(".authors-text");
    expect(text).toHaveClass("authors-text-collapsed", "authors-text-faded");
    const toggle = screen.getByRole("button", { name: "Show all choreographers" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(text).not.toHaveClass("authors-text-collapsed");
    expect(text).not.toHaveClass("authors-text-faded");
    expect(screen.getByText(authors.join(", "))).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(onParentClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show fewer choreographers" }));
    expect(text).toHaveClass("authors-text-collapsed", "authors-text-faded");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("does not fade or offer expansion for names fitting within two lines", () => {
    const { container } = render(<ChoreographyCard choreography={makeChoreography()} />);

    expect(container.querySelector(".authors-text")).not.toHaveClass("authors-text-faded");
    expect(screen.queryByRole("button", { name: "Show all choreographers" })).toBeNull();
    expect(screen.getByText("Alice, Bob")).toBeInTheDocument();
  });

  it("omits the choreographers section when no names are available", () => {
    render(<ChoreographyCard choreography={makeChoreography({ authors: [] })} />);
    expect(screen.queryByText("Choreographers:")).not.toBeInTheDocument();
  });

  it("renders core choreography fields and links", () => {
    render(<ChoreographyCard choreography={makeChoreography()} />);

    expect(screen.getByText("Neon Waltz (2024)")).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.getByText(/Count\/Wall:/)).toBeInTheDocument();
    expect(screen.getByText(/Choreographers:/)).toBeInTheDocument();
    expect(screen.getByText(/Tags:/)).toBeInTheDocument();
    expect(screen.getByText("Restart 🔁")).toBeInTheDocument();
    expect(screen.getByText("Tag 🌉")).toBeInTheDocument();
    expect(screen.queryByText("Restart Information")).not.toBeInTheDocument();
    expect(screen.queryByText("Tag Information")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: /open step sheet in a new tab/i })).toHaveAttribute(
      "href",
      "https://example.com/step-sheet",
    );
    expect(screen.getByRole("link", { name: /watch demo/i })).toHaveAttribute(
      "href",
      "https://example.com/demo",
    );
    expect(screen.getByRole("link", { name: /watch tutorial/i })).toHaveAttribute(
      "href",
      "https://example.com/tutorial",
    );

    const tutorialAction = screen.getByRole("link", { name: "Open tutorial in a new tab" });
    expect(tutorialAction).toHaveAttribute("href", "https://example.com/tutorial");
    expect(tutorialAction).toHaveAttribute("target", "_blank");
    expect(tutorialAction).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("displays and copies zero-valued numeric fields", () => {
    const choreography = makeChoreography({ count: 0, wall_count: 0, creation_year: 0 });
    render(<ChoreographyCard choreography={choreography} />);
    expect(screen.getByText("Neon Waltz (0)")).toBeInTheDocument();
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
    expect(buildChoreographyClipboardText(choreography)).toContain("Count / Wall: 0 / 0");
    expect(buildChoreographyClipboardText(choreography)).toContain("Neon Waltz (0)");
  });

  it("omits the tutorial footer action when no tutorial URL is available", () => {
    render(<ChoreographyCard choreography={makeChoreography({ tutorial_video_url: undefined })} />);

    expect(
      screen.queryByRole("link", { name: "Open tutorial in a new tab" }),
    ).not.toBeInTheDocument();
  });

  it("shows restart/tag badges in small cards even without step figures", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          step_figures: [],
          choreography_information: [
            { id: 3, category: "Restart", description: "Restart after wall 2" },
            { id: 12, category: "Restart", description: "Restart after wall 4" },
            { id: 4, category: "Tag", description: "Tag after chorus" },
            { id: 7, category: "Ending", description: "Finish facing forward" },
            { id: 8, category: "Intro", description: "Start after the first eight" },
            { id: 9, category: "Sequence", description: "Repeat the second wall" },
            { id: 10, category: "Styling", description: "Add arm styling" },
            { id: 11, category: "Freestyle", description: "Keep it relaxed" },
          ],
        })}
      />,
    );

    expect(screen.getByText("Restart 🔁")).toHaveAttribute(
      "title",
      "Restart after wall 2\nRestart after wall 4",
    );
    expect(screen.getByText("Tag 🌉")).toHaveAttribute("title", "Tag after chorus");
    expect(screen.getByText("Ending 🏁")).toBeInTheDocument();
    expect(screen.getByText("Intro ➡️")).toBeInTheDocument();
    expect(screen.getByText("Sequence 🆎")).toBeInTheDocument();
    expect(screen.getByText("Styling 💅")).toBeInTheDocument();
    expect(screen.getByText("Freestyle ℹ️")).toBeInTheDocument();
    expect(screen.queryByText("No step figures")).not.toBeInTheDocument();
    expect(screen.queryByText("Restart Information")).not.toBeInTheDocument();
    expect(screen.queryByText("Tag Information")).not.toBeInTheDocument();
  });

  it("shows a single song without alternatives and with search buttons on the detail card", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [
            { id: 1, title: "Faded", artist: "Alan Walker", is_favorite: false },
          ],
        })}
        videoEmbedMode="all"
      />,
    );

    expect(screen.getByText("Faded by Alan Walker")).toBeInTheDocument();
    expect(screen.queryByText("Alternative songs:")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: 'Open "Alan Walker - Faded" on YouTube' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: 'Open "Alan Walker - Faded" on Spotify' }),
    ).toBeInTheDocument();
  });

  it("shows the favorite song first and lists alternatives with their notes", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [
            { id: 1, title: "Remix", artist: "DJ", note: "faster", is_favorite: false },
            { id: 2, title: "Original", artist: "Queen", is_favorite: true },
          ],
        })}
        videoEmbedMode="all"
      />,
    );

    expect(screen.getByText("Original by Queen")).toBeInTheDocument();
    const alternatives = screen.getByText("Alternative songs:").closest(".alternative-songs");
    expect(alternatives).toHaveTextContent("DJ - Remix");
    expect(alternatives).toHaveTextContent("faster");
    expect(alternatives).not.toHaveTextContent("Original");
    expect(screen.getByRole("link", { name: /Queen - Original" on YouTube/ })).toBeInTheDocument();
  });

  it("shows tempo, genre and length of the favorite and of the alternative songs", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [
            {
              id: 1,
              title: "Remix",
              artist: "DJ",
              bpm: 140,
              genre: "Dance",
              is_favorite: false,
            },
            {
              id: 2,
              title: "Original",
              artist: "Queen",
              bpm: 120,
              genre: "Rock",
              length_seconds: 225,
              is_favorite: true,
            },
          ],
        })}
        videoEmbedMode="all"
      />,
    );

    expect(screen.getByText("120 BPM · Rock · 3:45")).toBeInTheDocument();
    const alternatives = screen.getByText("Alternative songs:").closest(".alternative-songs");
    expect(alternatives).toHaveTextContent("140 BPM · Dance");
  });

  it("shows no music line for songs without metadata", () => {
    const { container } = render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [{ id: 1, title: "Plain", is_favorite: false }],
        })}
      />,
    );

    expect(container.querySelector(".song-music")).toBeNull();
  });

  it("links to a stored link instead of a search and shows a song that has no artist", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [
            { id: 1, title: "Solo", youtube_url: "https://youtu.be/abc", is_favorite: false },
          ],
        })}
      />,
    );

    expect(screen.getByRole("link", { name: /on YouTube/i })).toHaveAttribute(
      "href",
      "https://youtu.be/abc",
    );
    expect(screen.queryByRole("link", { name: /on Spotify/i })).not.toBeInTheDocument();
  });

  it("shows every information category and description on the detail card", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_information: [
            { id: 5, category: "Ending", description: "Hold the final pose" },
            { id: 6, category: "Custom", description: "Face the front wall" },
          ],
        })}
        videoEmbedMode="all"
      />,
    );

    expect(screen.getByText("Ending")).toBeInTheDocument();
    expect(screen.getByText("Hold the final pose")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Face the front wall")).toBeInTheDocument();
  });

  it("embeds only one YouTube video in default single mode (demo has priority)", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          demo_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          tutorial_video_url: "https://youtu.be/9bZkp7q19f0",
        })}
      />,
    );

    expect(screen.getByTitle("Demo video for Neon Waltz")).toHaveAttribute(
      "referrerpolicy",
      "strict-origin-when-cross-origin",
    );
    expect(screen.queryByTitle("Tutorial video for Neon Waltz")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /watch demo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /watch tutorial/i })).not.toBeInTheDocument();
  });

  it("embeds tutorial in single mode when demo URL is missing", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          demo_video_url: undefined,
          tutorial_video_url: "https://youtu.be/9bZkp7q19f0",
        })}
      />,
    );

    expect(screen.getByTitle("Tutorial video for Neon Waltz")).toBeInTheDocument();
    expect(screen.queryByTitle("Demo video for Neon Waltz")).not.toBeInTheDocument();
  });

  it("embeds both YouTube videos in all mode", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          demo_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          tutorial_video_url: "https://youtu.be/9bZkp7q19f0",
        })}
        videoEmbedMode="all"
      />,
    );

    expect(screen.getByTitle("Demo video for Neon Waltz")).toBeInTheDocument();
    expect(screen.getByTitle("Tutorial video for Neon Waltz")).toBeInTheDocument();
  });

  it("calls onEdit and onDelete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ChoreographyCard choreography={makeChoreography()} onEdit={onEdit} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete choreography" }));

    expect(onEdit).toHaveBeenCalledWith(42);
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  it("updates a choreography rating through the page view model", async () => {
    render(<ChoreographyCard choreography={makeChoreography()} />);

    fireEvent.click(screen.getByRole("button", { name: /open rating editor/i }));
    fireEvent.click(screen.getByRole("button", { name: "Rate 4 stars" }));

    await waitFor(() => {
      expect(setChoreographyRating).toHaveBeenCalledWith(42, 4);
    });
    expect(deleteChoreographyRating).not.toHaveBeenCalled();
  });

  it("shows YouTube and Spotify footer links only when the song has an artist or stored links", () => {
    const { rerender } = render(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [{ id: 1, title: "Faded", is_favorite: false }],
        })}
      />,
    );

    expect(screen.queryByRole("link", { name: /on YouTube/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /on Spotify/i })).not.toBeInTheDocument();

    rerender(
      <ChoreographyCard
        choreography={makeChoreography({
          choreography_songs: [
            { id: 1, title: "Faded", artist: "Alan Walker", is_favorite: false },
          ],
        })}
      />,
    );

    const youtubeLink = screen.getByRole("link", { name: /on YouTube/i });
    const spotifyLink = screen.getByRole("link", { name: /on Spotify/i });

    expect(youtubeLink).toHaveAttribute(
      "href",
      "https://www.youtube.com/results?search_query=Alan+Walker+Faded",
    );
    expect(spotifyLink).toHaveAttribute(
      "href",
      "https://open.spotify.com/search/Alan+Walker+Faded",
    );
  });

  it.each([
    ["wishlist", "🤍", "Wishlist"],
    ["learned", "✅", "Learned"],
  ] as const)("shows the %s marker before the title", (status, emoji, label) => {
    render(<ChoreographyCard choreography={makeChoreography({ learning_status: status })} />);

    const marker = screen.getByRole("img", { name: label });
    expect(marker).toHaveTextContent(emoji);
    expect(marker.closest("h3")?.textContent).toBe(`${emoji} Neon Waltz (2024)`);
  });

  it("shows no marker and no date without a learning status", () => {
    const { container } = render(<ChoreographyCard choreography={makeChoreography()} />);

    expect(screen.queryByRole("img", { name: /wishlist|learned/i })).toBeNull();
    expect(container.querySelector(".learning-status-date")).toBeNull();
  });

  it("shows since when the status was set", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          learning_status: "learned",
          learning_status_date: "2026-11-24",
        })}
      />,
    );

    expect(screen.getByText("Learned since 2026-11-24")).toBeInTheDocument();
  });

  it("sets a learning status and reflects it immediately", async () => {
    render(<ChoreographyCard choreography={makeChoreography()} />);

    const wishlist = screen.getByRole("button", { name: "Wishlist" });
    expect(wishlist).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(wishlist);

    expect(screen.getByRole("button", { name: "Wishlist" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("img", { name: "Wishlist" })).toBeInTheDocument();
    await waitFor(() => {
      expect(setChoreographyLearningStatus).toHaveBeenCalledWith(42, "wishlist");
    });
  });

  it("replaces the status when the other one is chosen", async () => {
    render(<ChoreographyCard choreography={makeChoreography({ learning_status: "wishlist" })} />);

    fireEvent.click(screen.getByRole("button", { name: "Learned" }));

    await waitFor(() => {
      expect(setChoreographyLearningStatus).toHaveBeenCalledWith(42, "learned");
    });
    expect(deleteChoreographyLearningStatus).not.toHaveBeenCalled();
  });

  it("clears the status when the active one is pressed again", async () => {
    render(<ChoreographyCard choreography={makeChoreography({ learning_status: "learned" })} />);

    fireEvent.click(screen.getByRole("button", { name: "Learned" }));

    await waitFor(() => {
      expect(deleteChoreographyLearningStatus).toHaveBeenCalledWith(42);
    });
    expect(setChoreographyLearningStatus).not.toHaveBeenCalled();
  });

  it("falls back to the stored status when saving fails", async () => {
    vi.mocked(setChoreographyLearningStatus).mockRejectedValueOnce(new Error("offline"));
    render(<ChoreographyCard choreography={makeChoreography()} />);

    fireEvent.click(screen.getByRole("button", { name: "Learned" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Learned" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
    expect(screen.queryByRole("img", { name: "Learned" })).toBeNull();
  });

  it("marks a personal level in the badge and keeps the official level in the title", () => {
    render(
      <ChoreographyCard
        choreography={makeChoreography({
          level: "Advanced",
          official_level: "Intermediate",
          personal_level: "Advanced",
        })}
      />,
    );

    const badge = screen.getByText("Advanced").closest(".level-badge");
    expect(badge).toHaveAttribute("title", "Personal level (official: Intermediate)");
    expect(screen.getByText(/Personal level, official level Intermediate/)).toBeInTheDocument();
  });

  it("does not mark the level when no personal level exists", () => {
    render(<ChoreographyCard choreography={makeChoreography()} />);

    expect(screen.getByText("Intermediate").closest(".level-badge")).not.toHaveAttribute("title");
    expect(screen.queryByText(/Personal level, official level/)).toBeNull();
  });

  it("copies formatted choreography text to clipboard when copy action is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const choreography = makeChoreography();
    render(<ChoreographyCard choreography={choreography} />);

    fireEvent.click(screen.getByRole("button", { name: /copy choreography details/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith(buildChoreographyClipboardText(choreography, {}));
    });
  });
});
