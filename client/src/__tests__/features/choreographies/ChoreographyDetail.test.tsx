import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import {
  checkChoreographyDuplicates,
  fetchChoreography,
  updateChoreography,
  validateChoreography,
} from "../../../features/choreographies/api";
import ChoreographyDetail from "../../../features/choreographies/views/ChoreographyDetailPage";
import {
  getAuthors,
  getChoreographyInfoCategories,
  getLevels,
  getStepFigures,
  getGenres,
  getTags,
} from "../../../features/metadata/api";
import { GlobalApiErrorNotice } from "../../../app/GlobalApiErrorNotice";
import { reportGlobalApiError } from "../../../shared/http/apiErrors";
import { renderWithQueryClient as render } from "../../helpers/renderWithQueryClient";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../../features/choreographies/api", () => ({
  fetchChoreography: vi.fn(),
  deleteChoreography: vi.fn(),
  updateChoreography: vi.fn(),
  checkChoreographyDuplicates: vi.fn(),
  validateChoreography: vi.fn(),
}));
vi.mock("../../../features/metadata/api", () => ({
  getLevels: vi.fn(),
  getAuthors: vi.fn(),
  getChoreographyInfoCategories: vi.fn(),
  getTags: vi.fn(),
  getGenres: vi.fn(),
  getStepFigures: vi.fn(),
}));

const TWO_LEVELS = [
  { id: 2, name: "Intermediate", value: 50 },
  { id: 3, name: "Advanced", value: 150 },
];

const BASE_CHOREOGRAPHY = {
  id: 1,
  name: "Neon Waltz",
  level: "Intermediate",
  official_level: "Intermediate",
  personal_level: null,
  count: 32,
  wall_count: 4,
  creation_year: 2024,
  step_sheet_link: "https://example.com/step-sheet",
  demo_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  tutorial_video_url: "https://youtu.be/9bZkp7q19f0",
  authors: ["Alice"],
  tags: ["classic"],
  step_figures: ["Weave"],
  rating: null,
  learning_status: null,
  learning_status_date: null,
  choreography_songs: [],
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("ChoreographyDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchChoreography).mockResolvedValue(BASE_CHOREOGRAPHY);
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(updateChoreography).mockResolvedValue({ id: 1, message: "updated" });
    vi.mocked(validateChoreography).mockResolvedValue();
    vi.mocked(getLevels).mockResolvedValue([{ id: 2, name: "Intermediate", value: 50 }]);
    vi.mocked(getAuthors).mockResolvedValue([]);
    vi.mocked(getChoreographyInfoCategories).mockResolvedValue([
      "Restart",
      "Tag",
      "Ending",
      "Intro",
      "Sequence",
      "Styling",
    ]);
    vi.mocked(getTags).mockResolvedValue([]);
    vi.mocked(getGenres).mockResolvedValue([]);
    vi.mocked(getStepFigures).mockResolvedValue([]);
  });

  function renderDetail(path = "/choreographies/1") {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <GlobalApiErrorNotice />
        <Routes>
          <Route path="/choreographies/:id" element={<ChoreographyDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("embeds both demo and tutorial videos in detail view", async () => {
    renderDetail();

    expect(await screen.findByTitle("Demo video for Neon Waltz")).toBeInTheDocument();
    expect(screen.getByTitle("Tutorial video for Neon Waltz")).toBeInTheDocument();
  });

  it("shows the edit form in the white form view with the choreography title and level", async () => {
    const { container } = renderDetail("/choreographies/1?edit=1");

    expect(await screen.findByRole("heading", { name: "Neon Waltz" })).toBeInTheDocument();
    await screen.findAllByRole("option", { name: "Intermediate" });

    expect(container.querySelector(".form-view")).toBeInTheDocument();
    expect(container.querySelector(".form-view .level-badge")).toHaveTextContent("Intermediate");
    expect(screen.queryByRole("heading", { name: "Edit Choreography" })).not.toBeInTheDocument();
  });

  it("shows server validation issues in edit mode without checking duplicates or updating", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { issues: [{ field: "level", key: "invalid_level" }] } },
    });
    renderDetail("/choreographies/1?edit=1");
    await screen.findAllByRole("option", { name: "Intermediate" });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    expect(await screen.findByText("Select a valid level.")).toBeInTheDocument();
    expect(screen.getByLabelText("Official Level *")).toHaveAccessibleDescription(
      "Select a valid level.",
    );
    expect(checkChoreographyDuplicates).not.toHaveBeenCalled();
    expect(updateChoreography).not.toHaveBeenCalled();
  });

  it("shows duplicate warning in edit mode when duplicates are found", async () => {
    const duplicate = { id: 5, name: "Neon Waltz", level: "Intermediate", authors: ["Alice"] };
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);

    renderDetail("/choreographies/1?edit=1");

    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    // Wait for form reference data to fully load (same pattern as ChoreographyCreatePage tests)
    await screen.findAllByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton.closest("form")!);

    // Wait for the duplicate check to complete, then flush React's pending state updates
    await waitFor(() => expect(checkChoreographyDuplicates).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByText(/Possible duplicate found/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neon Waltz" })).toBeInTheDocument();
    expect(updateChoreography).not.toHaveBeenCalled();
  });

  it("passes the current choreography id as excludeId to the duplicate check", async () => {
    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Intermediate" });

    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => {
      expect(checkChoreographyDuplicates).toHaveBeenCalledWith(
        "Neon Waltz",
        "Intermediate",
        ["Alice"],
        1,
      );
    });
  });

  it("calls updateChoreography when Save anyway is clicked after duplicate warning", async () => {
    const duplicate = { id: 5, name: "Neon Waltz", level: "Intermediate", authors: ["Alice"] };
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);

    renderDetail("/choreographies/1?edit=1");
    const saveButton1 = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton1.closest("form")!);
    await waitFor(() => expect(checkChoreographyDuplicates).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));

    await waitFor(() => {
      expect(updateChoreography).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Neon Waltz" }),
      );
    });
  });

  it("edits and saves the official level even when a personal level is set", async () => {
    vi.mocked(fetchChoreography).mockResolvedValue({
      ...BASE_CHOREOGRAPHY,
      level: "Advanced",
      personal_level: "Advanced",
    });
    vi.mocked(getLevels).mockResolvedValue([
      { id: 2, name: "Intermediate", value: 50 },
      { id: 3, name: "Advanced", value: 150 },
    ]);

    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Advanced" });
    expect(screen.getByLabelText("Official Level *")).toHaveValue("Intermediate");

    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => expect(updateChoreography).toHaveBeenCalled());
    const [, payload] = vi.mocked(updateChoreography).mock.calls[0];
    expect(payload).toMatchObject({ level: "Intermediate", personal_level: "Advanced" });
    expect(payload).not.toHaveProperty("official_level");
  });

  it("shows the stored personal level in the form and sends it unchanged", async () => {
    vi.mocked(fetchChoreography).mockResolvedValue({
      ...BASE_CHOREOGRAPHY,
      level: "Advanced",
      personal_level: "Advanced",
    });
    vi.mocked(getLevels).mockResolvedValue(TWO_LEVELS);

    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Advanced" });
    expect(screen.getByLabelText("Personal Level")).toHaveValue("Advanced");
    expect(
      screen.getByRole("option", { name: "Same as official (Intermediate)" }),
    ).toBeInTheDocument();

    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => expect(updateChoreography).toHaveBeenCalled());
    expect(vi.mocked(updateChoreography).mock.calls[0][1]).toMatchObject({
      personal_level: "Advanced",
    });
  });

  it("sends a newly chosen personal level with the update request", async () => {
    vi.mocked(getLevels).mockResolvedValue(TWO_LEVELS);

    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Advanced" });
    fireEvent.change(screen.getByLabelText("Personal Level"), { target: { value: "Advanced" } });
    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => {
      expect(updateChoreography).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ level: "Intermediate", personal_level: "Advanced" }),
      );
    });
  });

  it("sends an empty personal level when 'Same as official' is chosen", async () => {
    vi.mocked(fetchChoreography).mockResolvedValue({
      ...BASE_CHOREOGRAPHY,
      level: "Advanced",
      personal_level: "Advanced",
    });
    vi.mocked(getLevels).mockResolvedValue(TWO_LEVELS);

    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Advanced" });
    fireEvent.change(screen.getByLabelText("Personal Level"), { target: { value: "" } });
    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => {
      expect(updateChoreography).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ personal_level: "" }),
      );
    });
  });

  it("preselects the stored learning status and sends an empty one when it is cleared", async () => {
    vi.mocked(fetchChoreography).mockResolvedValue({
      ...BASE_CHOREOGRAPHY,
      learning_status: "learned",
    });

    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    const select = screen.getByLabelText("Learning Status");
    expect(select).toHaveValue("learned");
    fireEvent.change(select, { target: { value: "" } });
    fireEvent.submit(saveButton.closest("form")!);

    await waitFor(() => {
      expect(updateChoreography).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ learning_status: "" }),
      );
    });
  });

  it("shows a backend issue for the personal level next to the field", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { issues: [{ field: "personal_level", key: "invalid_level" }] },
      },
    });
    renderDetail("/choreographies/1?edit=1");
    await screen.findAllByRole("option", { name: "Intermediate" });

    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

    expect(await screen.findByText("Select a valid personal level.")).toBeInTheDocument();
    expect(screen.getByLabelText("Personal Level")).toHaveAccessibleDescription(
      "Select a valid personal level.",
    );
    expect(updateChoreography).not.toHaveBeenCalled();
  });

  it("shows a retry hint when the server is restarting its database", async () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 503,
        data: { code: "DATABASE_RESTARTING" },
      },
    };
    vi.mocked(updateChoreography).mockImplementation(async () => {
      reportGlobalApiError(error);
      throw error;
    });

    renderDetail("/choreographies/1?edit=1");
    const saveButton = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton.closest("form")!);

    expect(
      await screen.findByText(/Your changes may not have been saved.*try again/i),
    ).toBeInTheDocument();
  });

  it("dismisses duplicate warning when Cancel is clicked without saving", async () => {
    const duplicate = { id: 5, name: "Neon Waltz", level: "Intermediate", authors: ["Alice"] };
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);

    renderDetail("/choreographies/1?edit=1");
    const saveButton2 = await screen.findByRole("button", { name: "Save Choreography" });
    await screen.findAllByRole("option", { name: "Intermediate" });
    fireEvent.submit(saveButton2.closest("form")!);
    await waitFor(() => expect(checkChoreographyDuplicates).toHaveBeenCalled());
    await act(async () => {});

    // Warning's Cancel button is the first Cancel in DOM order
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Possible duplicate found/)).not.toBeInTheDocument();
    });
    expect(updateChoreography).not.toHaveBeenCalled();
  });
});
