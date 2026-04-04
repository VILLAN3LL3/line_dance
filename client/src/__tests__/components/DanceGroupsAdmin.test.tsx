import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createDanceGroup, deleteDanceGroup, getDanceGroups, updateDanceGroup } from "../../api";
import { DanceGroupsAdmin } from "../../components/DanceGroupsAdmin";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api", () => ({
  getDanceGroups: vi.fn(),
  createDanceGroup: vi.fn(),
  updateDanceGroup: vi.fn(),
  deleteDanceGroup: vi.fn(),
}));

describe("DanceGroupsAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDanceGroups).mockResolvedValue([
      { id: 1, name: "Alpha Group", created_at: "2024-01-01" },
    ]);
    vi.mocked(createDanceGroup).mockResolvedValue({
      id: 3,
      name: "New Group",
      created_at: "2024-01-01",
    });
    vi.mocked(updateDanceGroup).mockResolvedValue({
      id: 1,
      name: "Renamed Group",
      created_at: "2024-01-01",
    });
    vi.mocked(deleteDanceGroup).mockResolvedValue({ message: "ok" });
  });

  it("loads and renders existing dance groups in list mode", async () => {
    render(
      <MemoryRouter>
        <DanceGroupsAdmin mode="list" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getDanceGroups).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Alpha Group")).toBeInTheDocument();
    expect(screen.getByText("Group #1")).toBeInTheDocument();
  });

  it("edits a group name and saves changes", async () => {
    render(
      <MemoryRouter>
        <DanceGroupsAdmin mode="list" />
      </MemoryRouter>,
    );

    await screen.findByText("Alpha Group");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByDisplayValue("Alpha Group");
    fireEvent.change(input, { target: { value: "Renamed Group" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateDanceGroup).toHaveBeenCalledWith(1, "Renamed Group");
    });
  });

  it("creates a new group in create mode and navigates to detail page", async () => {
    render(
      <MemoryRouter>
        <DanceGroupsAdmin mode="create" />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Group Name"), { target: { value: "New Group" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Group" }));

    await waitFor(() => {
      expect(createDanceGroup).toHaveBeenCalledWith("New Group");
      expect(mockNavigate).toHaveBeenCalledWith("/admin/groups/3");
    });
  });
});
