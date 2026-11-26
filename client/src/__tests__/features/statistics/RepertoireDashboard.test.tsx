import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, screen, waitFor, within } from "@testing-library/react";
import { render } from "@testing-library/react";

import { fetchRepertoireStatistics } from "../../../features/statistics/api";
import { RepertoireDashboard } from "../../../features/statistics/views/RepertoireDashboard";
import { useRepertoireStatisticsViewModel } from "../../../features/statistics/viewmodels/useRepertoireStatisticsViewModel";
import type { RepertoireStatisticsViewModel } from "../../../features/statistics/viewmodels/useRepertoireStatisticsViewModel";
import { createQueryWrapper } from "../../helpers/renderWithQueryClient";
import { statistics } from "./testData";

vi.mock("../../../features/statistics/api", () => ({ fetchRepertoireStatistics: vi.fn() }));

const viewModel = (
  state: Partial<RepertoireStatisticsViewModel["state"]>,
): RepertoireStatisticsViewModel => ({
  state: { statistics: null, isLoading: false, error: null, ...state },
});

describe("useRepertoireStatisticsViewModel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads the statistics", async () => {
    vi.mocked(fetchRepertoireStatistics).mockResolvedValue(statistics);
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useRepertoireStatisticsViewModel(), { wrapper });
    expect(result.current.state.isLoading).toBe(true);

    await waitFor(() => expect(result.current.state.statistics).toEqual(statistics));
    expect(result.current.state.error).toBeNull();
  });

  it("reports a load failure", async () => {
    vi.mocked(fetchRepertoireStatistics).mockRejectedValue(new Error("down"));
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useRepertoireStatisticsViewModel(), { wrapper });

    await waitFor(() => expect(result.current.state.error).toBe("Failed to load your statistics"));
  });
});

describe("RepertoireDashboard", () => {
  it("shows loading, error and empty states", () => {
    const { rerender } = render(<RepertoireDashboard viewModel={viewModel({ isLoading: true })} />);
    expect(screen.getByText("Loading your statistics...")).toBeInTheDocument();

    rerender(
      <RepertoireDashboard viewModel={viewModel({ error: "Failed to load your statistics" })} />,
    );
    expect(screen.getByText("Failed to load your statistics")).toBeInTheDocument();

    rerender(
      <RepertoireDashboard
        viewModel={viewModel({ statistics: { ...statistics, total: 0, levels: [] } })}
      />,
    );
    expect(screen.getByText(/No learned dances yet/)).toBeInTheDocument();
  });

  it("shows the total and every statistic with counts and shares", () => {
    render(<RepertoireDashboard viewModel={viewModel({ statistics })} />);

    expect(screen.getByText("learned dances", { exact: false }).textContent).toContain("8");
    const levels = screen.getByRole("region", { name: "By level" });
    expect(within(levels).getByText("BEGINNER")).toBeInTheDocument();
    expect(within(levels).getByText("BEGINNER").closest("li")).toHaveTextContent("6 (75 %)");
    ["By tempo", "By genre", "By creation year", "By choreographer"].forEach((name) =>
      expect(screen.getByRole("region", { name })).toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole("region", { name: "By tempo" })).getByText("Unknown"),
    ).toBeInTheDocument();
  });

  it("shows level, tempo and genre as donuts with a legend and the others as bars", () => {
    const { container } = render(<RepertoireDashboard viewModel={viewModel({ statistics })} />);

    ["By level", "By tempo", "By genre"].forEach((name) => {
      const region = screen.getByRole("region", { name });
      expect(region.querySelector(".stat-donut")).not.toBeNull();
      expect(region.querySelector(".stat-bar-track")).toBeNull();
    });
    ["By creation year", "By choreographer"].forEach((name) => {
      const region = screen.getByRole("region", { name });
      expect(region.querySelector(".stat-donut")).toBeNull();
      expect(region.querySelector(".stat-bar-track")).not.toBeNull();
    });
    // Tempo classes without dances are not part of the legend.
    const tempo = screen.getByRole("region", { name: "By tempo" });
    expect(within(tempo).queryByText("Below 100 BPM")).toBeNull();
    expect(within(tempo).getByText("100–119 BPM")).toBeInTheDocument();
    expect(container.querySelectorAll(".stat-donut")).toHaveLength(3);
  });

  it("sums up genres beyond the five most frequent as Other", () => {
    const genres = Array.from({ length: 8 }, (_, index) => ({
      key: `g${index}`,
      label: `Genre ${index}`,
      count: 8 - index,
    }));
    render(
      <RepertoireDashboard
        viewModel={viewModel({ statistics: { ...statistics, total: 36, genres } })}
      />,
    );

    const region = screen.getByRole("region", { name: "By genre" });
    expect(within(region).getByText("Genre 4")).toBeInTheDocument();
    expect(within(region).queryByText("Genre 5")).toBeNull();
    expect(within(region).getByText("Other").closest("li")).toHaveTextContent("6 (17 %)");
    expect(within(region).getByText('3 more genres are summed up as "Other".')).toBeInTheDocument();
  });

  it("says that the years are the creation years of the choreographies", () => {
    render(<RepertoireDashboard viewModel={viewModel({ statistics })} />);

    const years = screen.getByRole("region", { name: "By creation year" });
    expect(
      within(years).getByText(
        "The year the choreography was created, not the year you learned it.",
      ),
    ).toBeInTheDocument();
    expect(within(years).getByText("2021")).toBeInTheDocument();
  });

  it("explains how choreographers are counted and how many are not listed", () => {
    render(<RepertoireDashboard viewModel={viewModel({ statistics })} />);
    expect(screen.getByText(/2 more choreographers with fewer dances/)).toBeInTheDocument();

    render(
      <RepertoireDashboard
        viewModel={viewModel({ statistics: { ...statistics, other_choreographers: 0 } })}
      />,
    );
    expect(screen.getAllByText("A dance counts for each of its choreographers.")).toHaveLength(1);
  });

  it("shows the timeline as a table with the months, newest first, and the undated dances", () => {
    render(<RepertoireDashboard viewModel={viewModel({ statistics })} />);

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "Mar 2026428",
      "Feb 2026064",
      "Jan 2026304",
    ]);
    expect(screen.getByText(/1 learned dance has no learning date/)).toBeInTheDocument();
  });

  it("says so when there is nothing on the timeline", () => {
    render(
      <RepertoireDashboard
        viewModel={viewModel({
          statistics: { ...statistics, timeline: { months: [], undated: 0 } },
        })}
      />,
    );
    expect(screen.getByText("No dated learning or practice yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
