import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRouter } from "../../app/AppRouter";
import { searchChoreographies } from "../../features/choreographies/api";
import {
  fetchPracticeIntervals,
  fetchPracticeLog,
  fetchPracticeSuggestions,
} from "../../features/practice/api";
import { fetchRepertoireStatistics } from "../../features/statistics/api";
import { getTrainers } from "../../features/trainers/api";
import { renderWithQueryClient as render } from "../helpers/renderWithQueryClient";
import { statistics } from "./../features/statistics/testData";
import { makeDance, makeSummary } from "../features/practice/testData";

vi.mock("../../features/choreographies/api", () => ({
  searchChoreographies: vi.fn(),
  setChoreographyLearningStatus: vi.fn(),
  deleteChoreographyLearningStatus: vi.fn(),
  deleteChoreographyRating: vi.fn(),
  setChoreographyRating: vi.fn(),
}));
vi.mock("../../features/practice/api", () => ({
  fetchPracticeSuggestions: vi.fn(),
  fetchPracticeIntervals: vi.fn(),
  fetchPracticeLog: vi.fn(),
  logPractice: vi.fn(),
  setPracticeBaseline: vi.fn(),
  deletePracticeEntry: vi.fn(),
}));
vi.mock("../../features/statistics/api", () => ({ fetchRepertoireStatistics: vi.fn() }));
vi.mock("../../features/trainers/api", () => ({ getTrainers: vi.fn() }));
vi.mock("../../features/metadata/api", () => ({ getCountryCodes: vi.fn().mockResolvedValue({}) }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );

describe("sidebar menu of the personal area", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(searchChoreographies).mockImplementation(async (filters) => {
      const data =
        filters.learning_status === "wishlist"
          ? [makeDance(1, "Wished", { learning_status: "wishlist" })]
          : [makeDance(2, "Known"), makeDance(3, "Other")];
      return { data, pagination: { page: 1, limit: 10, total: data.length, totalPages: 1 } };
    });
    vi.mocked(fetchPracticeSuggestions).mockResolvedValue([makeSummary(2), makeSummary(3)]);
    vi.mocked(fetchPracticeIntervals).mockResolvedValue([]);
    vi.mocked(fetchPracticeLog).mockResolvedValue({ data: [], total: 0 });
    vi.mocked(fetchRepertoireStatistics).mockResolvedValue(statistics);
    vi.mocked(getTrainers).mockResolvedValue([]);
  });

  it("opens the dashboard when the personal area is entered and lists its sections", async () => {
    renderAt("/personal");

    const menu = await screen.findByRole("list", { name: "Personal" });
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    const entries = within(menu).getAllByRole("link");
    expect(entries.map((link) => link.getAttribute("href"))).toEqual([
      "/personal/dashboard",
      "/personal/wishlist",
      "/personal/learned",
      "/personal/practice",
      "/personal/log",
    ]);
    expect(within(menu).getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(menu).getByRole("link", { name: /Wishlist/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("shows the counts as badges", async () => {
    renderAt("/personal/dashboard");

    const menu = await screen.findByRole("list", { name: "Personal" });
    expect(await within(menu).findByRole("link", { name: /^Wishlist\s*1$/ })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /^Learned\s*2$/ })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /^Practice\s*2$/ })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Practice log" })).toBeInTheDocument();
  });

  it("switches the section with the submenu entries", async () => {
    renderAt("/personal/dashboard");
    const menu = await screen.findByRole("list", { name: "Personal" });

    fireEvent.click(within(menu).getByRole("link", { name: /Wishlist/ }));

    expect(await screen.findByRole("heading", { name: /Wishlist/ })).toBeInTheDocument();
    expect(await screen.findByText("Wished")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /Wishlist/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows the submenu only inside the personal area", async () => {
    renderAt("/trainers");

    expect(await screen.findByRole("link", { name: /Personal/ })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Personal" })).toBeNull();
    expect(searchChoreographies).not.toHaveBeenCalled();
  });
});
