import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, screen, waitFor } from "@testing-library/react";

import { getMaxChoreographyCount } from "../../../features/choreographies/api";
import { useSearchBarViewModel } from "../../../features/choreographies/viewmodels/useSearchBarViewModel";
import { SearchBar as SearchBarView } from "../../../features/choreographies/views/search-bar/SearchBar";
import {
  getAuthors,
  getGenres,
  getLevels,
  getStepFigures,
  getTags,
} from "../../../features/metadata/api";
import {
  deleteSavedFilterConfiguration,
  getSavedFilterConfigurations,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
} from "../../../features/saved-filters/api";
import { renderWithQueryClient as render } from "../../helpers/renderWithQueryClient";
import type { SearchFilters } from "../../../types";
import type { ComponentProps } from "react";

const SearchBar = ({
  onSearch,
  filters = {},
  ...props
}: Omit<ComponentProps<typeof SearchBarView>, "viewModel"> & {
  onSearch: (filters: SearchFilters) => Promise<void>;
  filters?: SearchFilters;
}) => {
  const viewModel = useSearchBarViewModel({
    filters,
    onSearch,
    isLoading: props.isLoading ?? false,
  });
  return <SearchBarView {...props} viewModel={viewModel} />;
};

vi.mock("../../../features/metadata/api", () => ({
  getLevels: vi.fn(),
  getStepFigures: vi.fn(),
  getTags: vi.fn(),
  getGenres: vi.fn(),
  getAuthors: vi.fn(),
}));
vi.mock("../../../features/choreographies/api", () => ({
  getMaxChoreographyCount: vi.fn(),
}));
vi.mock("../../../features/saved-filters/api", () => ({
  getSavedFilterConfigurations: vi.fn(),
  saveFilterConfiguration: vi.fn(),
  updateSavedFilterConfiguration: vi.fn(),
  deleteSavedFilterConfiguration: vi.fn(),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLevels).mockResolvedValue([
      { id: 1, name: "Beginner", value: 10 },
      { id: 2, name: "Intermediate", value: 20 },
      { id: 3, name: "Advanced", value: 30 },
    ]);
    vi.mocked(getStepFigures).mockResolvedValue(["Mambo"]);
    vi.mocked(getTags).mockResolvedValue(["classic"]);
    vi.mocked(getGenres).mockResolvedValue([]);
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
    expect(screen.queryByPlaceholderText("Configuration name...")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /saved configurations/i }));
    expect(screen.getByPlaceholderText("Configuration name...")).toBeInTheDocument();

    await waitFor(() => {
      expect(getSavedFilterConfigurations).toHaveBeenCalledTimes(1);
    });
  });

  it("groups choreographers and rating under max counts while keeping tags full-width", () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));

    const maxCountColumn = screen.getByText("Max Counts").parentElement?.parentElement;
    expect(maxCountColumn).toHaveClass("advanced-filter-column");
    expect(screen.getByText("Choreographers").parentElement?.parentElement).toBe(maxCountColumn);
    expect(screen.getByText("Minimum Rating").parentElement?.parentElement).toBe(maxCountColumn);

    const tagFilter = screen.getByText("Tags").parentElement;
    expect(tagFilter).toHaveClass("advanced-filter-tags");
    expect(tagFilter?.parentElement).toHaveClass("advanced-filters");
  });

  it("searches on blur only when the filters changed", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);
    const input = screen.getByPlaceholderText(/search choreographies by name/i);

    fireEvent.blur(input);
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "waltz" } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ search: "waltz" }));
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

  it("shows Apply Filters in the toolbar only when advanced filters are open", () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    expect(screen.queryByRole("button", { name: /apply filters/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));

    const applyButton = screen.getByRole("button", { name: /apply filters/i });
    expect(applyButton.parentElement).toHaveClass("filter-toolbar");
  });

  it("adds a level filter from the autocomplete", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));

    const levelInput = await screen.findByRole("combobox", { name: "Level" });

    fireEvent.change(levelInput, {
      target: { value: "Beginner" },
    });
    fireEvent.keyDown(levelInput, { key: "Enter", code: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ level: ["Beginner"] }));
    });
  });

  it("adds a max level filter using the selected level value", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.click(screen.getByRole("radio", { name: /up to max level/i }));

    const maxLevelSelect = await screen.findByRole("combobox", { name: "Level" });
    await screen.findByRole("option", { name: /intermediate/i });
    fireEvent.change(maxLevelSelect, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ max_level_value: 20 }));
    });
  });

  it("filters on the official level when the option is checked", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /use official level/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ use_official_level: true }));
    });
  });

  it("searches with BPM, length and genre filters", async () => {
    vi.mocked(getGenres).mockResolvedValue(["Country", "Pop"]);
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.change(screen.getByLabelText("Min BPM"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Max BPM"), { target: { value: "130" } });
    fireEvent.change(screen.getByLabelText("Max length"), { target: { value: "3:45" } });
    const genreInput = await screen.findByRole("combobox", { name: "Genres" });
    fireEvent.change(genreInput, { target: { value: "country" } });
    fireEvent.keyDown(genreInput, { key: "Enter", code: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          min_bpm: 100,
          max_bpm: 130,
          max_length_seconds: 225,
          genres: ["Country"],
        }),
      );
    });
  });

  it("restores the music filters and flags a length that is not m:ss", () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{ min_bpm: 90, max_length_seconds: 180 }} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    expect(screen.getByLabelText("Min BPM")).toHaveValue(90);
    const length = screen.getByLabelText("Max length");
    expect(length).toHaveValue("3:00");
    expect(length).not.toHaveAttribute("aria-invalid");

    fireEvent.change(length, { target: { value: "180" } });
    expect(length).toHaveAttribute("aria-invalid", "true");
    expect(length).toHaveAccessibleDescription("Enter the length as m:ss, e.g. 3:45.");
  });

  it("adds tags to the excluded list", async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchBar onSearch={onSearch} filters={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.click(screen.getByRole("radio", { name: /exclude matches/i }));

    const tagInput = await screen.findByRole("combobox", { name: "Tags" });
    fireEvent.change(tagInput, { target: { value: "classic" } });
    fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({ excluded_tags: ["classic"] }),
      );
    });
  });
});
