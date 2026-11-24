import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import {
  deleteChoreography,
  getMaxChoreographyCount,
  searchChoreographies,
} from "../../../features/choreographies/api";
import {
  getAuthors,
  getGenres,
  getLevels,
  getStepFigures,
  getTags,
} from "../../../features/metadata/api";
import { getSavedFilterConfigurations } from "../../../features/saved-filters/api";
import { useChoreographySearchViewModel } from "../../../features/choreographies/viewmodels/useChoreographySearchViewModel";
import { createQueryClient } from "../../../shared/query/queryClient";

import type { SearchFilters } from "../../../types";

vi.mock("../../../features/choreographies/api", () => ({
  searchChoreographies: vi.fn(),
  deleteChoreography: vi.fn(),
  getMaxChoreographyCount: vi.fn(),
}));
vi.mock("../../../features/metadata/api", () => ({
  getAuthors: vi.fn(),
  getLevels: vi.fn(),
  getStepFigures: vi.fn(),
  getTags: vi.fn(),
  getGenres: vi.fn(),
}));
vi.mock("../../../features/saved-filters/api", () => ({
  getSavedFilterConfigurations: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const choreography = { id: 5, name: "Neon Waltz", level: "Beginner" };
const page = (data: unknown[]) => ({
  data,
  pagination: { page: 1, limit: 10000, total: data.length, totalPages: 1 },
});

function renderViewModel(initialEntry: string | { pathname: string; state: unknown } = "/") {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useChoreographySearchViewModel(), { wrapper });
}

describe("useChoreographySearchViewModel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(searchChoreographies).mockResolvedValue(page([choreography]) as never);
    vi.mocked(getMaxChoreographyCount).mockResolvedValue(0);
    vi.mocked(getAuthors).mockResolvedValue([]);
    vi.mocked(getLevels).mockResolvedValue([]);
    vi.mocked(getStepFigures).mockResolvedValue([]);
    vi.mocked(getTags).mockResolvedValue([]);
    vi.mocked(getGenres).mockResolvedValue([]);
    vi.mocked(getSavedFilterConfigurations).mockResolvedValue([]);
  });

  it("loads all matches with the stored filters and persists them", async () => {
    localStorage.setItem("currentFilters", JSON.stringify({ search: "neon" }));
    const { result } = renderViewModel();

    await waitFor(() => expect(result.current.state.choreographies).toHaveLength(1));
    expect(searchChoreographies).toHaveBeenCalledWith({ search: "neon", page: 1, limit: 10000 });
    expect(JSON.parse(localStorage.getItem("currentFilters") ?? "{}")).toEqual({ search: "neon" });
  });

  it("prefers filters from router state and clears them from the history", async () => {
    const initialFilters: SearchFilters = { search: "route" };
    localStorage.setItem("currentFilters", JSON.stringify({ search: "stored" }));
    const { result } = renderViewModel({ pathname: "/", state: { initialFilters } });

    await waitFor(() => expect(result.current.state.choreographies).toHaveLength(1));
    expect(result.current.state.currentFilters).toEqual(initialFilters);
  });

  it("remembers the display mode", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    act(() => result.current.actions.changeDisplayMode("table"));
    expect(localStorage.getItem("displayMode")).toBe("table");
  });

  it("searches with new filters and reloads for identical ones", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(() => result.current.actions.search({ search: "a" }));
    await waitFor(() => expect(searchChoreographies).toHaveBeenCalledTimes(2));
    expect(result.current.state.currentFilters).toEqual({ search: "a" });

    await act(() => result.current.actions.search({ search: "a" }));
    await waitFor(() => expect(searchChoreographies).toHaveBeenCalledTimes(3));
  });

  it("reports a load failure", async () => {
    vi.mocked(searchChoreographies).mockRejectedValue(new Error("down"));
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.error).toBe("Failed to load choreographies"));
  });

  it("shows the detail view for a selected choreography and returns to the list", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.choreographies).toHaveLength(1));

    act(() => result.current.actions.selectChoreography(5));
    expect(result.current.state.view).toBe("detail");
    expect(result.current.state.selectedChoreography?.id).toBe(5);

    act(() => result.current.actions.showList());
    expect(result.current.state.view).toBe("list");
  });

  it("deletes a choreography, reloads and returns to the list", async () => {
    vi.mocked(deleteChoreography).mockResolvedValue({ message: "ok" });
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.choreographies).toHaveLength(1));
    act(() => result.current.actions.selectChoreography(5));

    await act(() => result.current.actions.removeChoreography(5));
    expect(deleteChoreography).toHaveBeenCalledWith(5);
    expect(searchChoreographies).toHaveBeenCalledTimes(2);
    expect(result.current.state.view).toBe("list");
  });

  it("keeps the view and shows an error when deletion fails", async () => {
    vi.mocked(deleteChoreography).mockRejectedValue(new Error("nope"));
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.choreographies).toHaveLength(1));
    act(() => result.current.actions.selectChoreography(5));

    await act(() => result.current.actions.removeChoreography(5));
    expect(result.current.state.error).toBe("Failed to delete choreography");
    expect(result.current.state.view).toBe("detail");
  });

  it("navigates to the create and edit pages", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    result.current.actions.addChoreography();
    expect(mockNavigate).toHaveBeenCalledWith("/choreographies/new");
    result.current.actions.editChoreography(5);
    expect(mockNavigate).toHaveBeenCalledWith("/choreographies/5", { state: { editMode: true } });
  });
});
