import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import {
  deleteSavedFilterConfiguration,
  getSavedFilterConfigurations,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
} from "../../../features/saved-filters/api";
import { useSavedFiltersViewModel } from "../../../features/saved-filters/viewmodels/useSavedFiltersViewModel";
import { createQueryWrapper } from "../../helpers/renderWithQueryClient";

vi.mock("../../../features/saved-filters/api", () => ({
  getSavedFilterConfigurations: vi.fn(),
  saveFilterConfiguration: vi.fn(),
  updateSavedFilterConfiguration: vi.fn(),
  deleteSavedFilterConfiguration: vi.fn(),
}));

const config = {
  id: 1,
  name: "Mine",
  filters: { search: "abc" },
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

function renderViewModel() {
  const buildFilters = vi.fn(() => ({ search: "current" }));
  const applyLoadedFilters = vi.fn().mockResolvedValue(undefined);
  const { wrapper } = createQueryWrapper();
  const hook = renderHook(
    () => useSavedFiltersViewModel({ buildFilters, applyLoadedFilters, isLoading: false }),
    { wrapper },
  );
  return { ...hook, buildFilters, applyLoadedFilters };
}

describe("useSavedFiltersViewModel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getSavedFilterConfigurations).mockResolvedValue([config]);
  });

  it("loads configurations", async () => {
    const { result } = renderViewModel();
    expect(result.current.state.isLoadingConfigurations).toBe(true);
    await waitFor(() => expect(result.current.state.configurations).toEqual([config]));
    expect(result.current.state.isLoadingConfigurations).toBe(false);
  });

  it("reports a load failure", async () => {
    vi.mocked(getSavedFilterConfigurations).mockRejectedValue(new Error("down"));
    const { result } = renderViewModel();
    await waitFor(() =>
      expect(result.current.state.error).toBe("Failed to load saved filter configurations"),
    );
  });

  it("requires a name before saving", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.configurations).toHaveLength(1));
    await act(() => result.current.actions.save());
    expect(result.current.state.error).toBe("Please enter a name for this filter configuration");
    expect(saveFilterConfiguration).not.toHaveBeenCalled();
  });

  it("saves the current filters, selects the new configuration and reloads", async () => {
    vi.mocked(saveFilterConfiguration).mockResolvedValue({ ...config, id: 2, name: "New" });
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.configurations).toHaveLength(1));
    act(() => result.current.actions.changeName("  New  "));

    await act(() => result.current.actions.save());
    expect(saveFilterConfiguration).toHaveBeenCalledWith("New", { search: "current" });
    expect(result.current.state.message).toBe('Saved "New"');
    expect(result.current.state.selectedConfigurationId).toBe("2");
    expect(result.current.state.configurationName).toBe("New");
    expect(getSavedFilterConfigurations).toHaveBeenCalledTimes(2);
  });

  it("loads the selected configuration into the search", async () => {
    const { result, applyLoadedFilters } = renderViewModel();
    await waitFor(() => expect(result.current.state.configurations).toHaveLength(1));

    await act(() => result.current.actions.load());
    expect(result.current.state.error).toBe("Please select a saved configuration to load");

    act(() => result.current.actions.chooseConfiguration("1"));
    expect(result.current.state.configurationName).toBe("Mine");
    await act(() => result.current.actions.load());
    expect(applyLoadedFilters).toHaveBeenCalledWith({ search: "abc" });
    expect(result.current.state.message).toBe('Loaded "Mine"');
  });

  it("updates the stored filters and renames the selected configuration", async () => {
    vi.mocked(updateSavedFilterConfiguration).mockResolvedValue({ ...config, name: "Renamed" });
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.configurations).toHaveLength(1));

    await act(() => result.current.actions.updateFilters());
    expect(result.current.state.error).toBe("Please select a saved configuration first");

    act(() => result.current.actions.chooseConfiguration("1"));
    await act(() => result.current.actions.updateFilters());
    expect(updateSavedFilterConfiguration).toHaveBeenCalledWith(1, {
      filters: { search: "current" },
    });

    act(() => result.current.actions.changeName("Renamed"));
    await act(() => result.current.actions.rename());
    expect(updateSavedFilterConfiguration).toHaveBeenCalledWith(1, { name: "Renamed" });
    expect(result.current.state.message).toBe('Renamed to "Renamed"');
  });

  it("deletes the selected configuration and clears the selection", async () => {
    vi.mocked(deleteSavedFilterConfiguration).mockResolvedValue({ message: "ok" });
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.configurations).toHaveLength(1));
    act(() => result.current.actions.chooseConfiguration("1"));

    await act(() => result.current.actions.remove());
    expect(deleteSavedFilterConfiguration).toHaveBeenCalledWith(1);
    expect(result.current.state.selectedConfigurationId).toBe("");
    expect(result.current.state.message).toBe('Deleted "Mine"');
  });

  it("shows a failure message when saving fails", async () => {
    vi.mocked(saveFilterConfiguration).mockRejectedValue(new Error("boom"));
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.configurations).toHaveLength(1));
    act(() => result.current.actions.changeName("New"));

    await act(() => result.current.actions.save());
    expect(result.current.state.error).toBe("Failed to save filter configuration");
  });
});
