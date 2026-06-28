import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import {
  deleteDanceCourse,
  exportDanceCoursePdf,
  fetchChoreographies,
  getDanceCourses,
  getDanceGroup,
  getGroupBaseStepFigures,
  getGroupMaxLevel,
  getLearnedChoreographies,
  getLevels,
  getSessions,
  getStepFigureSuggestions,
  getStepFiguresWithIds,
  updateGroupBaseStepFigures,
  updateGroupMaxLevel,
} from "../../api";
import DanceGroupDetail from "../../components/dance-groups/DanceGroupDetail";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api", () => ({
  deleteDanceCourse: vi.fn(),
  exportDanceCoursePdf: vi.fn(),
  fetchChoreographies: vi.fn(),
  getDanceCourses: vi.fn(),
  getDanceGroup: vi.fn(),
  getGroupBaseStepFigures: vi.fn(),
  getGroupMaxLevel: vi.fn(),
  getLevels: vi.fn(),
  getLearnedChoreographies: vi.fn(),
  getSessions: vi.fn(),
  getStepFigureSuggestions: vi.fn(),
  getStepFiguresWithIds: vi.fn(),
  updateGroupBaseStepFigures: vi.fn(),
  updateGroupMaxLevel: vi.fn(),
}));

describe("DanceGroupDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getDanceGroup).mockResolvedValue({
      id: 1,
      name: "Group One",
      max_group_level_value: 30,
      created_at: "2024-01-01",
    });
    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 1,
        dance_group_id: 1,
        dance_group_name: "Group One",
        semester: "WS 2024",
        start_date: "2020-01-01",
        youtube_playlist_url: "https://www.youtube.com/playlist?list=PL1234567890",
        created_at: "2024-01-01",
      },
      {
        id: 2,
        dance_group_id: 1,
        dance_group_name: "Group One",
        semester: "WS 2099",
        start_date: "2099-01-01",
        created_at: "2024-01-01",
      },
    ]);
    vi.mocked(getSessions).mockResolvedValue([]);
    vi.mocked(getLearnedChoreographies).mockResolvedValue([]);
    vi.mocked(getLevels).mockResolvedValue([
      { id: 1, name: "BEGINNER", value: 30 },
      { id: 2, name: "ADVANCED", value: 150 },
    ]);
    vi.mocked(getGroupMaxLevel).mockResolvedValue({ max_group_level_value: 30 });
    vi.mocked(updateGroupMaxLevel).mockResolvedValue({ max_group_level_value: 150 });
    vi.mocked(fetchChoreographies).mockResolvedValue({
      data: [
        {
          id: 10,
          name: "Dance X",
          level: "Beginner",
          authors: [],
          tags: [],
          step_figures: ["Mambo"],
          rating: null,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ],
      pagination: { page: 1, limit: 10000, total: 1, totalPages: 1 },
    });
    vi.mocked(deleteDanceCourse).mockResolvedValue({ message: "ok" });
    vi.mocked(exportDanceCoursePdf).mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" }),
    );
    vi.mocked(getStepFigureSuggestions).mockResolvedValue([]);
    vi.mocked(getGroupBaseStepFigures).mockResolvedValue([]);
    vi.mocked(getStepFiguresWithIds).mockResolvedValue([]);
    vi.mocked(updateGroupBaseStepFigures).mockResolvedValue([]);
  });

  function renderWithRoute() {
    return render(
      <MemoryRouter initialEntries={["/admin/groups/1"]}>
        <Routes>
          <Route path="/admin/groups/:groupId" element={<DanceGroupDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows running courses by default and can include planned courses", async () => {
    renderWithRoute();

    await screen.findByText("Group One");

    expect(screen.getByText("(WS 2024)")).toBeInTheDocument();
    expect(screen.queryByText("(WS 2099)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Planned" }));

    expect(await screen.findByText("(WS 2099)")).toBeInTheDocument();
  });

  it("shows the next planned course by default when no running courses exist", async () => {
    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 3,
        dance_group_id: 1,
        dance_group_name: "Group One",
        semester: "SS 2100",
        start_date: "2100-04-01",
        created_at: "2024-01-01",
      },
      {
        id: 2,
        dance_group_id: 1,
        dance_group_name: "Group One",
        semester: "WS 2099",
        start_date: "2099-01-01",
        created_at: "2024-01-01",
      },
    ]);

    renderWithRoute();

    await screen.findByText("Group One");

    expect(screen.getByText("(WS 2099)")).toBeInTheDocument();
    expect(screen.queryByText("(SS 2100)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Planned" }));

    expect(await screen.findByText("(SS 2100)")).toBeInTheDocument();
  });

  it("updates max group level from the select", async () => {
    renderWithRoute();
    await screen.findByText("Group One");

    fireEvent.change(screen.getByRole("combobox", { name: "Max group level" }), {
      target: { value: "150" },
    });

    await waitFor(() => {
      expect(updateGroupMaxLevel).toHaveBeenCalledWith(1, 150);
    });
  });

  it("shows a YouTube playlist link when present on a course", async () => {
    renderWithRoute();

    const youtubeLink = await screen.findByRole("link", { name: "Link: YouTube" });
    expect(youtubeLink).toHaveAttribute(
      "href",
      "https://www.youtube.com/playlist?list=PL1234567890",
    );
  });

  it("includes base step figures in the learned step figures tag cloud", async () => {
    vi.mocked(getGroupBaseStepFigures).mockResolvedValue([
      { id: 1, name: "Hip Bump" },
      { id: 2, name: "Kick" },
    ]);
    vi.mocked(getLearnedChoreographies).mockResolvedValue([]);

    renderWithRoute();
    await screen.findByText("Group One");

    const tagCloud = document.querySelector(".tags-container")!;
    expect(within(tagCloud).getByText("Hip Bump")).toBeInTheDocument();
    expect(within(tagCloud).getByText("Kick")).toBeInTheDocument();
  });

  it("merges base and choreo-derived step figures without duplicates", async () => {
    vi.mocked(getGroupBaseStepFigures).mockResolvedValue([{ id: 1, name: "Mambo" }]);
    vi.mocked(getLearnedChoreographies).mockResolvedValue([
      {
        dance_group_id: 1,
        dance_group_name: "Group One",
        choreography_id: 10,
        times_danced: 2,
        first_learned_date: "2020-01-01",
        last_danced_date: "2024-01-01",
      },
    ]);
    // choreography 10 has step_figure "Mambo" (same as base figure)

    renderWithRoute();
    await screen.findByText("Group One");

    // The tag cloud should contain exactly one "Mambo" entry
    const tagCloud = document.querySelector(".tags-container");
    const mamboTags = tagCloud
      ? [...tagCloud.querySelectorAll(".tag")].filter((t) => t.textContent === "Mambo")
      : [];
    expect(mamboTags).toHaveLength(1);
  });

  it("removes a base step figure when the remove button is clicked", async () => {
    vi.mocked(getGroupBaseStepFigures).mockResolvedValue([
      { id: 1, name: "Hip Bump" },
      { id: 2, name: "Kick" },
    ]);
    vi.mocked(updateGroupBaseStepFigures).mockResolvedValue([{ id: 2, name: "Kick" }]);

    renderWithRoute();
    await screen.findByText("Group One");
    await screen.findByLabelText("Remove Hip Bump");

    fireEvent.click(screen.getByLabelText("Remove Hip Bump"));

    await waitFor(() => {
      expect(updateGroupBaseStepFigures).toHaveBeenCalledWith(1, [2]);
    });
  });

  it("adds a base step figure when selected from the dropdown", async () => {
    vi.mocked(getGroupBaseStepFigures).mockResolvedValue([{ id: 1, name: "Hip Bump" }]);
    vi.mocked(getStepFiguresWithIds).mockResolvedValue([
      { id: 1, name: "Hip Bump" },
      { id: 2, name: "Vine" },
    ]);
    vi.mocked(updateGroupBaseStepFigures).mockResolvedValue([
      { id: 1, name: "Hip Bump" },
      { id: 2, name: "Vine" },
    ]);

    renderWithRoute();
    await screen.findByText("Group One");
    const select = await screen.findByLabelText("Add base step figure");

    fireEvent.change(select, { target: { value: "2" } });

    await waitFor(() => {
      expect(updateGroupBaseStepFigures).toHaveBeenCalledWith(1, [1, 2]);
    });
  });

  it("shows base and choreo-derived figures combined and sorted alphabetically", async () => {
    vi.mocked(getGroupBaseStepFigures).mockResolvedValue([
      { id: 1, name: "Kick" },
      { id: 2, name: "Hip Bump" },
    ]);
    vi.mocked(getLearnedChoreographies).mockResolvedValue([
      {
        dance_group_id: 1,
        dance_group_name: "Group One",
        choreography_id: 10,
        times_danced: 1,
        first_learned_date: "2020-01-01",
        last_danced_date: "2024-01-01",
      },
    ]);
    // choreography 10 has step_figure "Mambo"

    renderWithRoute();
    await screen.findByText("Group One");

    const tagCloud = document.querySelector(".tags-container");
    const names = tagCloud
      ? [...tagCloud.querySelectorAll(".tag")].map((t) => t.textContent ?? "")
      : [];
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
