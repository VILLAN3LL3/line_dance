import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getAuthorStats, getLevels } from "../../api";
import ChoreographersPage from "../../components/choreographies/ChoreographersPage";
import type { AuthorStats, LevelOption } from "../../types";

vi.mock("../../api", () => ({
  getAuthorStats: vi.fn(),
  getLevels: vi.fn(),
}));

const mockLevels: LevelOption[] = [
  { id: 1, name: "Beginner", value: 10 },
  { id: 2, name: "Advanced", value: 40 },
];

const mockStats: AuthorStats[] = [
  { name: "Alice", total: 3, by_level: { Beginner: 2, Advanced: 1 } },
  { name: "Bob", total: 1, by_level: { Beginner: 1 } },
  { name: "Charlie", total: 2, by_level: { Advanced: 2 } },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthorStats).mockResolvedValue(mockStats);
  vi.mocked(getLevels).mockResolvedValue(mockLevels);
});

describe("ChoreographersPage", () => {
  it("shows loading state initially", () => {
    vi.mocked(getAuthorStats).mockReturnValue(new Promise(() => {}));
    render(<ChoreographersPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders author names and totals after load", async () => {
    render(<ChoreographersPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    // totals: Alice=3, Bob=1, Charlie=2
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("shows error state when API fails", async () => {
    vi.mocked(getAuthorStats).mockRejectedValue(new Error("network"));
    render(<ChoreographersPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/failed to load choreographer statistics/i),
      ).toBeInTheDocument(),
    );
  });

  it("filters authors by name", async () => {
    render(<ChoreographersPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Filter by name…"), { target: { value: "ali" } });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("shows empty state when name filter matches nothing", async () => {
    render(<ChoreographersPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Filter by name…"), { target: { value: "zzz" } });

    expect(
      screen.getByText(/no choreographers match the current filters/i),
    ).toBeInTheDocument();
  });

  it("filters by level — shows only authors with choreos at that level", async () => {
    render(<ChoreographersPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));

    // Alice and Charlie have Advanced choreos; Bob does not
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("clicking author name calls window.open with author filter", async () => {
    const openSpy = vi.spyOn(globalThis, "open").mockImplementation(() => null);

    render(<ChoreographersPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('"authors":["Alice"]')),
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("clicking level count calls window.open with author + level filter", async () => {
    const openSpy = vi.spyOn(globalThis, "open").mockImplementation(() => null);

    render(<ChoreographersPage />);
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole("button", { name: /2 beginner choreographies by alice/i }),
    );

    const url = openSpy.mock.calls[0][0] as string;
    const decoded = decodeURIComponent(url.replace("/?filters=", ""));
    const filters = JSON.parse(decoded);
    expect(filters.authors).toEqual(["Alice"]);
    expect(filters.level).toEqual(["Beginner"]);

    openSpy.mockRestore();
  });
});
