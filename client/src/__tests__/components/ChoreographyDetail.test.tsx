import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  checkChoreographyDuplicates,
  fetchChoreography,
  getAuthors,
  getLevels,
  getStepFigures,
  getTags,
  updateChoreography,
} from "../../api";
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
  checkChoreographyDuplicates: vi.fn(),
  getLevels: vi.fn(),
  getAuthors: vi.fn(),
  getTags: vi.fn(),
  getStepFigures: vi.fn(),
}));

const BASE_CHOREOGRAPHY = {
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
  rating: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("ChoreographyDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchChoreography).mockResolvedValue(BASE_CHOREOGRAPHY);
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(updateChoreography).mockResolvedValue({ id: 1, message: "updated" });
    vi.mocked(getLevels).mockResolvedValue([{ id: 2, name: "Intermediate", value: 50 }]);
    vi.mocked(getAuthors).mockResolvedValue([]);
    vi.mocked(getTags).mockResolvedValue([]);
    vi.mocked(getStepFigures).mockResolvedValue([]);
  });

  function renderDetail(path = "/choreographies/1") {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/choreographies/:id" element={<ChoreographyDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("embeds both demo and tutorial videos in detail view", async () => {
    renderDetail();

    expect(await screen.findByTitle("Demo video for Neon Waltz")).toBeInTheDocument();
    expect(screen.getByTitle("Tutorial video for Neon Waltz")).toBeInTheDocument();
  });

  it("shows duplicate warning in edit mode when duplicates are found", async () => {
    const duplicate = { id: 5, name: "Neon Waltz", level: "Intermediate", authors: ["Alice"] };
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);

    renderDetail("/choreographies/1?edit=1");

    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    // Wait for form reference data to fully load (same pattern as ChoreographyCreatePage tests)
    await screen.findByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton.closest("form")!);

    // Wait for the duplicate check to complete, then flush React's pending state updates
    await waitFor(() => expect(checkChoreographyDuplicates).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByText(/Possible duplicate found/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neon Waltz" })).toBeInTheDocument();
    expect(updateChoreography).not.toHaveBeenCalled();
  });

  it("passes the current choreography id as excludeId to the duplicate check", async () => {
    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findByRole("option", { name: "Intermediate" });

    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => {
      expect(checkChoreographyDuplicates).toHaveBeenCalledWith(
        "Neon Waltz",
        "Intermediate",
        ["Alice"],
        1,
      );
    });
  });

  it("calls updateChoreography when Save anyway is clicked after duplicate warning", async () => {
    const duplicate = { id: 5, name: "Neon Waltz", level: "Intermediate", authors: ["Alice"] };
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);

    renderDetail("/choreographies/1?edit=1");
    const saveButton1 = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton1.closest("form")!);
    await waitFor(() => expect(checkChoreographyDuplicates).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));

    await waitFor(() => {
      expect(updateChoreography).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Neon Waltz" }),
      );
    });
  });

  it("dismisses duplicate warning when Cancel is clicked without saving", async () => {
    const duplicate = { id: 5, name: "Neon Waltz", level: "Intermediate", authors: ["Alice"] };
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);

    renderDetail("/choreographies/1?edit=1");
    const saveButton2 = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton2.closest("form")!);
    await waitFor(() => expect(checkChoreographyDuplicates).toHaveBeenCalled());
    await act(async () => {});

    // Warning's Cancel button is the first Cancel in DOM order
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Possible duplicate found/)).not.toBeInTheDocument();
    });
    expect(updateChoreography).not.toHaveBeenCalled();
  });
});
