import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  deleteDanceCourse,
  exportDanceCoursePdf,
  fetchChoreographies,
  getDanceCourses,
  getDanceGroup,
  getGroupMaxLevel,
  getLevels,
  getLearnedChoreographies,
  getSessions,
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
  getGroupMaxLevel: vi.fn(),
  getLevels: vi.fn(),
  getLearnedChoreographies: vi.fn(),
  getSessions: vi.fn(),
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
});
