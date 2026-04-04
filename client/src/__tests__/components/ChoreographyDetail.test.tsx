import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";

import { fetchChoreography } from "../../api";
import ChoreographyDetail from "../../components/choreographies/ChoreographyDetail";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api", () => ({
  fetchChoreography: vi.fn(),
  deleteChoreography: vi.fn(),
  updateChoreography: vi.fn(),
}));

describe("ChoreographyDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fetchChoreography).mockResolvedValue({
      id: 1,
      name: "Neon Waltz",
      level: "Intermediate",
      count: 32,
      wall_count: 4,
      creation_year: 2024,
      step_sheet_link: "https://example.com/step-sheet",
      demo_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      tutorial_video_url: "https://youtu.be/9bZkp7q19f0",
      authors: ["Alice"],
      tags: ["classic"],
      step_figures: ["Weave"],
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });
  });

  it("embeds both demo and tutorial videos in detail view", async () => {
    render(
      <MemoryRouter initialEntries={["/choreographies/1"]}>
        <Routes>
          <Route path="/choreographies/:id" element={<ChoreographyDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTitle("Demo video for Neon Waltz")).toBeInTheDocument();
    expect(screen.getByTitle("Tutorial video for Neon Waltz")).toBeInTheDocument();
  });
});
