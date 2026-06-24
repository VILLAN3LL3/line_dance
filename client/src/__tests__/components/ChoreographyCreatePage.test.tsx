import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  checkChoreographyDuplicates,
  createChoreography,
  getAuthors,
  getLevels,
  getStepFigures,
  getTags,
} from "../../api";
import ChoreographyCreatePage from "../../components/choreographies/ChoreographyCreatePage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api", () => ({
  checkChoreographyDuplicates: vi.fn(),
  createChoreography: vi.fn(),
  getAuthors: vi.fn(),
  getLevels: vi.fn(),
  getStepFigures: vi.fn(),
  getTags: vi.fn(),
}));

const DUPLICATE = { id: 7, name: "River Dance", level: "BEGINNER", authors: ["Alice"] };

describe("ChoreographyCreatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLevels).mockResolvedValue([{ id: 1, name: "Beginner", value: 30 }]);
    vi.mocked(getAuthors).mockResolvedValue([]);
    vi.mocked(getTags).mockResolvedValue([]);
    vi.mocked(getStepFigures).mockResolvedValue([]);
    vi.mocked(createChoreography).mockResolvedValue({ id: 99, message: "created" });
  });

  async function renderAndSubmit() {
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Wait for levels to load before interacting with the select
    await screen.findByRole("option", { name: "Beginner" });

    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    fireEvent.change(screen.getByLabelText("Level *"), { target: { value: "Beginner" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
  }

  it("shows duplicate warning and does not save when duplicates are found", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([DUPLICATE]);

    await renderAndSubmit();

    expect(await screen.findByText(/Possible duplicate found/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "River Dance" })).toBeInTheDocument();
    expect(createChoreography).not.toHaveBeenCalled();
  });

  it("calls createChoreography when Save anyway is clicked after duplicate warning", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([DUPLICATE]);

    await renderAndSubmit();
    await screen.findByText(/Possible duplicate found/);

    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));

    await waitFor(() => {
      expect(createChoreography).toHaveBeenCalledOnce();
    });
  });

  it("dismisses the duplicate warning when Cancel is clicked without saving", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([DUPLICATE]);

    await renderAndSubmit();
    await screen.findByText(/Possible duplicate found/);

    // Click the warning's Cancel button (first Cancel in DOM order)
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Possible duplicate found/)).not.toBeInTheDocument();
    });
    expect(createChoreography).not.toHaveBeenCalled();
  });

  it("calls createChoreography directly when no duplicates are found", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);

    await renderAndSubmit();

    await waitFor(() => {
      expect(createChoreography).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText(/Possible duplicate found/)).not.toBeInTheDocument();
  });
});
