import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import {
  addChoreographyToSession, createSession, deleteSession, fetchChoreographies, getDanceCourses, getSessionChoreographies, getSessions,
  getSessionStepFigureSuggestions, removeChoreographyFromSession, swapSessions
} from "../../api";
import CourseDetail from "../../components/courses/CourseDetail";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api", () => ({
  addChoreographyToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  fetchChoreographies: vi.fn(),
  getDanceCourses: vi.fn(),
  getSessionChoreographies: vi.fn(),
  getSessionStepFigureSuggestions: vi.fn(),
  getSessions: vi.fn(),
  removeChoreographyFromSession: vi.fn(),
  swapSessions: vi.fn(),
  updateSession: vi.fn(),
}));

describe("CourseDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const berlinTodayIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const yesterday = new Date(`${berlinTodayIso}T12:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(`${berlinTodayIso}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 7,
        dance_group_id: 2,
        dance_group_name: "Group Two",
        semester: "WS 2025",
        created_at: "2024-01-01",
      },
    ]);
    vi.mocked(getSessions).mockResolvedValue([
      {
        id: 11,
        dance_course_id: 7,
        session_date: toIsoDate(yesterday),
        dance_group_name: "Group Two",
        semester: "WS 2025",
        comment: null,
        created_at: "2024-01-01",
      },
      {
        id: 12,
        dance_course_id: 7,
        session_date: toIsoDate(tomorrow),
        dance_group_name: "Group Two",
        semester: "WS 2025",
        comment: null,
        created_at: "2024-01-01",
      },
    ]);
    vi.mocked(fetchChoreographies).mockResolvedValue({
      data: [
        {
          id: 101,
          name: "Dance One",
          level: "Beginner",
          authors: [],
          tags: [],
          step_figures: [],
          rating: null,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ],
      pagination: { page: 1, limit: 10000, total: 1, totalPages: 1 },
    });
    vi.mocked(getSessionChoreographies).mockResolvedValue([]);
    vi.mocked(createSession).mockResolvedValue({
      id: 12,
      dance_course_id: 7,
      session_date: "2025-02-01",
      dance_group_name: "Group Two",
      semester: "WS 2025",
      comment: null,
      created_at: "2024-01-01",
    });
    vi.mocked(addChoreographyToSession).mockResolvedValue({
      id: 1,
      session_id: 11,
      choreography_id: 101,
      created_at: "2024-01-01",
    });
    vi.mocked(deleteSession).mockResolvedValue({ message: "ok" });
    vi.mocked(removeChoreographyFromSession).mockResolvedValue({ message: "ok" });
    vi.mocked(swapSessions).mockResolvedValue({ message: "Sessions swapped successfully" });
    vi.mocked(getSessionStepFigureSuggestions).mockResolvedValue({
      suggestions: [],
      known_step_figures: [],
      max_level_value: null,
    });
  });

  function renderWithRoute() {
    return render(
      <MemoryRouter initialEntries={["/admin/groups/2/courses/7"]}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/:courseId" element={<CourseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("creates a new session from the session form", async () => {
    renderWithRoute();

    await screen.findByText(/Course: 7/);

    const dateInput = document.querySelector<HTMLInputElement>('.session-form input[type="date"]');
    expect(dateInput).not.toBeNull();
    if (!dateInput) {
      throw new Error("Session date input was not found");
    }
    fireEvent.change(dateInput, { target: { value: "2025-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Session" }));

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith(7, "2025-02-01", undefined);
    });
  });

  it("selects a session and adds choreography to that session", async () => {
    renderWithRoute();

    await screen.findByText(/Course: 7/);

    fireEvent.click(screen.getAllByRole("button", { name: /manage/i })[0]);

    const input = screen.getByPlaceholderText("Search choreography by name...");
    fireEvent.change(input, { target: { value: "Dance One (Beginner)" } });
    const addButton = screen.getByRole("button", { name: "+ Add to Session" });
    await waitFor(() => {
      expect(addButton).toBeEnabled();
    });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(addChoreographyToSession).toHaveBeenCalledWith(12, 101);
    });
  });

  it("shows planned sessions by default and can include passed sessions", async () => {
    renderWithRoute();

    await screen.findByText(/Course: 7/);

    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.queryByText("Passed")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Show passed sessions" }));

    expect(await screen.findByText("Passed")).toBeInTheDocument();
  });

  it("opens choreography card overlay when clicking a session choreography", async () => {
    vi.mocked(getSessionChoreographies).mockResolvedValue([
      {
        id: 1,
        session_id: 12,
        choreography_id: 101,
        created_at: "2024-01-01",
      },
    ]);

    renderWithRoute();

    await screen.findByText(/Course: 7/);

    fireEvent.click(screen.getAllByRole("button", { name: /manage/i })[0]);

    const openCardButton = await screen.findByRole("button", {
      name: /Open choreography card for Dance One/i,
    });
    fireEvent.click(openCardButton);

    const dialog = await screen.findByRole("dialog", {
      name: /Choreography details: Dance One/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Dance One" })).toBeInTheDocument();
  });

  it("shows swap dropdown when Swap button is clicked and calls swapSessions on confirm", async () => {
    renderWithRoute();
    await screen.findByText(/Course: 7/);

    // Click Swap on the first visible (planned) session
    fireEvent.click(screen.getByRole("button", { name: /^Swap$/i }));

    // Dropdown should appear with placeholder option
    const select = await screen.findByRole("combobox");
    expect(select).toBeInTheDocument();

    // Confirm button is disabled until a target is selected
    const confirmBtn = screen.getByRole("button", { name: /confirm swap/i });
    expect(confirmBtn).toBeDisabled();

    // Cancel hides the dropdown
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  it("loads and displays step figure suggestions when Suggest button is clicked", async () => {
    vi.mocked(getSessionStepFigureSuggestions).mockResolvedValue({
      suggestions: [{ step_figure: "Grapevine", additional_choreographies: 3 }],
      known_step_figures: ["Vine"],
      max_level_value: 30,
    });

    renderWithRoute();
    await screen.findByText(/Course: 7/);

    fireEvent.click(screen.getByRole("button", { name: /^Suggest$/i }));

    // Button label transitions to "Hide Suggestions" after loading
    expect(await screen.findByRole("button", { name: /hide suggestions/i })).toBeInTheDocument();

    // The suggestion pill is rendered
    expect(await screen.findByText(/Grapevine/)).toBeInTheDocument();
    expect(screen.getByText(/\+3/)).toBeInTheDocument();

    expect(getSessionStepFigureSuggestions).toHaveBeenCalledOnce();
  });

  it("hides suggestions when Hide Suggestions is clicked", async () => {
    vi.mocked(getSessionStepFigureSuggestions).mockResolvedValue({
      suggestions: [{ step_figure: "Kick", additional_choreographies: 1 }],
      known_step_figures: [],
      max_level_value: null,
    });

    renderWithRoute();
    await screen.findByText(/Course: 7/);

    fireEvent.click(screen.getByRole("button", { name: /^Suggest$/i }));
    await screen.findByRole("button", { name: /hide suggestions/i });

    fireEvent.click(screen.getByRole("button", { name: /hide suggestions/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Kick/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Suggest$/i })).toBeInTheDocument();
    });
  });
});
