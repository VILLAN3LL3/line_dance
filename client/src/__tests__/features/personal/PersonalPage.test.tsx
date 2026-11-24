import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, screen, waitFor } from "@testing-library/react";

import {
  deleteChoreographyLearningStatus,
  searchChoreographies,
  setChoreographyLearningStatus,
} from "../../../features/choreographies/api";
import {
  deletePracticeEntry,
  fetchPracticeLog,
  fetchPracticeSuggestions,
  logPractice,
} from "../../../features/practice/api";
import PersonalPage from "../../../features/personal/views/PersonalPage";
import { renderWithQueryClient as render } from "../../helpers/renderWithQueryClient";

import type { Choreography, LearningStatus } from "../../../types";

vi.mock("../../../features/choreographies/api", () => ({
  searchChoreographies: vi.fn(),
  setChoreographyLearningStatus: vi.fn().mockResolvedValue(undefined),
  deleteChoreographyLearningStatus: vi.fn().mockResolvedValue(undefined),
  deleteChoreographyRating: vi.fn().mockResolvedValue(undefined),
  setChoreographyRating: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../features/practice/api", () => ({
  fetchPracticeSuggestions: vi.fn(),
  fetchPracticeLog: vi.fn(),
  logPractice: vi.fn(),
  deletePracticeEntry: vi.fn(),
}));
vi.mock("../../../features/metadata/api", () => ({
  getCountryCodes: vi.fn().mockResolvedValue({}),
}));

function makeChoreography(
  id: number,
  name: string,
  learning_status: LearningStatus,
  learning_status_date: string | null = null,
): Choreography {
  return {
    id,
    name,
    level: "Beginner",
    official_level: "Beginner",
    personal_level: null,
    authors: [],
    tags: [],
    step_figures: [],
    rating: null,
    learning_status,
    learning_status_date,
    choreography_songs: [],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };
}

const page = (data: Choreography[]) => ({
  data,
  pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 },
});

function mockLists(wishlist: Choreography[], learned: Choreography[]) {
  vi.mocked(searchChoreographies).mockImplementation(async (filters) =>
    page(filters.learning_status === "wishlist" ? wishlist : learned),
  );
}

describe("PersonalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPracticeSuggestions).mockResolvedValue([]);
    vi.mocked(fetchPracticeLog).mockResolvedValue([]);
    vi.mocked(logPractice).mockResolvedValue({ logged: 1, practiced_on: "2026-11-24" });
    vi.mocked(deletePracticeEntry).mockResolvedValue({ message: "ok" });
  });

  it("shows the wishlist first and requests each list by its status", async () => {
    mockLists([makeChoreography(1, "Wished Dance", "wishlist")], []);
    render(<PersonalPage />);

    expect(await screen.findByText("Wished Dance")).toBeInTheDocument();
    expect(searchChoreographies).toHaveBeenCalledWith({ learning_status: "wishlist" });
    expect(searchChoreographies).toHaveBeenCalledWith({ learning_status: "learned" });
    expect(screen.getByRole("tab", { name: "🤍 Wishlist (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "✅ Learned (0)" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches to the learned dances", async () => {
    mockLists(
      [makeChoreography(1, "Wished Dance", "wishlist")],
      [makeChoreography(2, "Known Dance", "learned", "2026-11-24")],
    );
    render(<PersonalPage />);
    await screen.findByText("Wished Dance");

    fireEvent.click(screen.getByRole("tab", { name: /Learned/ }));

    expect(await screen.findByText("Known Dance")).toBeInTheDocument();
    expect(screen.queryByText("Wished Dance")).toBeNull();
    expect(screen.getByText("Learned since 2026-11-24")).toBeInTheDocument();
  });

  it("explains an empty list", async () => {
    mockLists([], []);
    render(<PersonalPage />);

    expect(await screen.findByText(/Your wishlist is empty/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Learned/ }));
    expect(screen.getByText(/No learned dances yet/)).toBeInTheDocument();
  });

  it("moves a dance to the other list after its status changed", async () => {
    let wishlist = [makeChoreography(1, "Wished Dance", "wishlist")];
    let learned: Choreography[] = [];
    vi.mocked(searchChoreographies).mockImplementation(async (filters) =>
      page(filters.learning_status === "wishlist" ? wishlist : learned),
    );
    vi.mocked(setChoreographyLearningStatus).mockImplementation(async (id, status) => {
      wishlist = [];
      learned = [makeChoreography(id, "Wished Dance", status, "2026-11-24")];
      return { choreography_id: id, status, status_date: "2026-11-24" };
    });
    render(<PersonalPage />);
    await screen.findByText("Wished Dance");

    fireEvent.click(screen.getByRole("button", { name: /Learning status: Wishlist/ }));
    fireEvent.click(screen.getByRole("button", { name: "Learned" }));

    await waitFor(() => {
      expect(screen.getByText(/Your wishlist is empty/)).toBeInTheDocument();
    });
    expect(setChoreographyLearningStatus).toHaveBeenCalledWith(1, "learned");
    expect(screen.getByRole("tab", { name: "✅ Learned (1)" })).toBeInTheDocument();
  });

  it('removes a dance from its list with the "No status" option', async () => {
    let wishlist = [makeChoreography(1, "Wished Dance", "wishlist")];
    vi.mocked(searchChoreographies).mockImplementation(async (filters) =>
      page(filters.learning_status === "wishlist" ? wishlist : []),
    );
    vi.mocked(deleteChoreographyLearningStatus).mockImplementation(async () => {
      wishlist = [];
      return { message: "Learning status removed" };
    });
    render(<PersonalPage />);
    await screen.findByText("Wished Dance");

    fireEvent.click(screen.getByRole("button", { name: /Learning status: Wishlist/ }));
    fireEvent.click(screen.getByRole("button", { name: "No status" }));

    await waitFor(() => {
      expect(screen.getByText(/Your wishlist is empty/)).toBeInTheDocument();
    });
    expect(deleteChoreographyLearningStatus).toHaveBeenCalledWith(1);
  });

  it("shows an error when the list cannot be loaded", async () => {
    vi.mocked(searchChoreographies).mockRejectedValue(new Error("offline"));
    render(<PersonalPage />);

    expect(await screen.findByText("Failed to load your dances")).toBeInTheDocument();
  });

  describe("practice", () => {
    const summary = (id: number, overrides = {}) => ({
      choreography_id: id,
      last_practiced_on: null,
      last_note: null,
      practice_count: 0,
      next_due_on: null,
      is_due: true,
      days_overdue: null,
      ...overrides,
    });

    it("shows the due dances as flip cards and counts them in the tab", async () => {
      mockLists(
        [],
        [
          makeChoreography(2, "Known Dance", "learned"),
          makeChoreography(3, "Later Dance", "learned"),
        ],
      );
      vi.mocked(fetchPracticeSuggestions).mockResolvedValue([
        summary(2),
        summary(3, { is_due: false, next_due_on: "2999-01-01", practice_count: 2 }),
      ]);
      render(<PersonalPage />);

      const tab = await screen.findByRole("tab", { name: "🔁 Practice (1)" });
      fireEvent.click(tab);

      expect(await screen.findByText("Time to practice (1)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show back of Known Dance" })).toBeInTheDocument();
      expect(screen.queryByText("Later Dance")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Show dances not due yet \(1\)/ }));
      expect(
        await screen.findByRole("button", { name: "Show back of Later Dance" }),
      ).toBeInTheDocument();
    });

    it("logs a practice from the back of a card", async () => {
      mockLists([], [makeChoreography(2, "Known Dance", "learned")]);
      vi.mocked(fetchPracticeSuggestions).mockResolvedValue([summary(2)]);
      render(<PersonalPage />);
      fireEvent.click(await screen.findByRole("tab", { name: /Practice \(1\)/ }));

      fireEvent.click(await screen.findByRole("button", { name: "Show back of Known Dance" }));
      fireEvent.change(screen.getByLabelText("Practiced on"), { target: { value: "2026-11-20" } });
      fireEvent.click(screen.getByRole("button", { name: /Unsure/ }));

      await waitFor(() => {
        expect(logPractice).toHaveBeenCalledWith({
          choreography_ids: [2],
          practiced_on: "2026-11-20",
          confidence: "unsure",
        });
      });
    });

    it("logs several dances at once with the quick capture", async () => {
      mockLists(
        [],
        [
          makeChoreography(2, "Known Dance", "learned"),
          makeChoreography(3, "Other Dance", "learned"),
        ],
      );
      vi.mocked(fetchPracticeSuggestions).mockResolvedValue([summary(2), summary(3)]);
      vi.mocked(logPractice).mockResolvedValue({ logged: 2, practiced_on: "2026-11-20" });
      render(<PersonalPage />);
      fireEvent.click(await screen.findByRole("tab", { name: /Practice \(2\)/ }));

      fireEvent.click(screen.getByRole("button", { name: /Log practice/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Known Dance" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Other Dance" }));
      fireEvent.change(
        screen.getByLabelText("Practiced on", { selector: "#practice-quick-log-date" }),
        {
          target: { value: "2026-11-20" },
        },
      );
      fireEvent.click(screen.getByRole("button", { name: "Log 2 dances" }));

      await waitFor(() => {
        expect(logPractice).toHaveBeenCalledWith({
          choreography_ids: [2, 3],
          practiced_on: "2026-11-20",
          confidence: "sure",
        });
      });
      expect(await screen.findByText("Logged 2 dances")).toBeInTheDocument();
    });

    it("explains an empty practice box", async () => {
      mockLists([], []);
      render(<PersonalPage />);
      fireEvent.click(await screen.findByRole("tab", { name: /^🔁 Practice/ }));

      expect(await screen.findByText(/No learned dances yet/)).toBeInTheDocument();
    });

    it("lists the practice log by day and deletes an entry", async () => {
      mockLists([], []);
      vi.mocked(fetchPracticeLog).mockResolvedValue([
        {
          id: 7,
          choreography_id: 2,
          choreography_name: "Known Dance",
          practiced_on: "2026-11-20",
          confidence: "unsure",
          note: "turn",
          song_id: null,
          song_title: null,
        },
      ]);
      render(<PersonalPage />);
      fireEvent.click(await screen.findByRole("tab", { name: /Practice log/ }));

      expect(await screen.findByText("2026-11-20")).toBeInTheDocument();
      expect(screen.getByText("Known Dance")).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Delete practice of Known Dance on 2026-11-20" }),
      );
      await waitFor(() => expect(deletePracticeEntry).toHaveBeenCalledWith(7));
    });
  });
});
