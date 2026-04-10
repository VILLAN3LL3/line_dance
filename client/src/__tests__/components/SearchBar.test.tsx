import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  deleteSavedFilterConfiguration,
  getAuthors,
  getLevels,
  getMaxChoreographyCount,
  getSavedFilterConfigurations,
  getStepFigures,
  getTags,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
} from "../../api";
import { SearchBar } from "../../components/choreographies/SearchBar";

vi.mock("../../api", () => ({
  getLevels: vi.fn(),
  getStepFigures: vi.fn(),
  getTags: vi.fn(),
  getAuthors: vi.fn(),
  getMaxChoreographyCount: vi.fn(),
  getSavedFilterConfigurations: vi.fn(),
  saveFilterConfiguration: vi.fn(),
  updateSavedFilterConfiguration: vi.fn(),
  deleteSavedFilterConfiguration: vi.fn(),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLevels).mockResolvedValue([{ id: 1, name: "Beginner" }]);
    vi.mocked(getStepFigures).mockResolvedValue(["Mambo"]);
    vi.mocked(getTags).mockResolvedValue(["classic"]);
    vi.mocked(getAuthors).mockResolvedValue(["Alice"]);
    vi.mocked(getMaxChoreographyCount).mockResolvedValue(64);
    vi.mocked(getSavedFilterConfigurations).mockResolvedValue([]);
    vi.mocked(saveFilterConfiguration).mockResolvedValue({
      id: 1,
      name: "My Filters",
      filters: { search: "abc" },
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });
    vi.mocked(updateSavedFilterConfiguration).mockResolvedValue({
      id: 1,
      name: "My Filters",
      filters: {},
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });
    vi.mocked(deleteSavedFilterConfiguration).mockResolvedValue({ message: "ok" });
  });

  it("loads filter metadata on mount", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    await waitFor(() => {
      expect(getLevels).toHaveBeenCalledTimes(1);
      expect(getStepFigures).toHaveBeenCalledTimes(1);
      expect(getTags).toHaveBeenCalledTimes(1);
      expect(getAuthors).toHaveBeenCalledTimes(1);
      expect(getMaxChoreographyCount).toHaveBeenCalledTimes(1);
    });
  });

  it("loads saved configurations when the saved configurations panel is opened", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.click(screen.getByRole("button", { name: /saved configurations/i }));

    await waitFor(() => {
      expect(getSavedFilterConfigurations).toHaveBeenCalledTimes(1);
    });
  });

  it("triggers search when user presses Enter in search input", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    const input = screen.getByPlaceholderText("Search choreographies by name...");
    fireEvent.change(input, { target: { value: "Tango" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ search: "Tango" }));
    });
  });

  it("clears all filters via Advanced panel action", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith({});
    });
  });

  it("adds a level filter from the select", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));

    const levelSelect = await screen.findByRole("combobox", { name: "Level:" });

    fireEvent.change(levelSelect, {
      target: { value: "Beginner" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ level: ["Beginner"] }));
    });
  });
});
