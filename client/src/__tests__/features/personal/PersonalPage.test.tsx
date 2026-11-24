import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, screen, waitFor } from "@testing-library/react";

import {
  deleteChoreographyLearningStatus,
  searchChoreographies,
  setChoreographyLearningStatus,
} from "../../../features/choreographies/api";
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
});
