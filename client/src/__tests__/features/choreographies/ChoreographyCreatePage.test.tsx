import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import {
  checkChoreographyDuplicates,
  createChoreography,
  validateChoreography,
} from "../../../features/choreographies/api";
import ChoreographyCreatePage from "../../../features/choreographies/views/ChoreographyCreatePage";
import {
  getAuthors,
  getChoreographyInfoCategories,
  getLevels,
  getStepFigures,
  getGenres,
  getTags,
} from "../../../features/metadata/api";
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
  checkChoreographyDuplicates: vi.fn(),
  createChoreography: vi.fn(),
  validateChoreography: vi.fn(),
}));
vi.mock("../../../features/metadata/api", () => ({
  getAuthors: vi.fn(),
  getChoreographyInfoCategories: vi.fn(),
  getLevels: vi.fn(),
  getStepFigures: vi.fn(),
  getTags: vi.fn(),
  getGenres: vi.fn(),
}));

const DUPLICATE = { id: 7, name: "River Dance", level: "BEGINNER", authors: ["Alice"] };

function validationFailure(issues: { field: string; key: string }[]) {
  return { isAxiosError: true, response: { status: 400, data: { issues } } };
}

describe("ChoreographyCreatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLevels).mockResolvedValue([{ id: 1, name: "Beginner", value: 30 }]);
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
    vi.mocked(createChoreography).mockResolvedValue({ id: 99, message: "created" });
    vi.mocked(validateChoreography).mockResolvedValue();
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
    await screen.findAllByRole("option", { name: "Beginner" });

    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
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

  it("sends the chosen personal level with the create request", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(getLevels).mockResolvedValue([
      { id: 1, name: "Beginner", value: 30 },
      { id: 2, name: "Advanced", value: 150 },
    ]);
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByRole("option", { name: "Beginner" });

    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
    fireEvent.change(screen.getByLabelText("Personal Level"), { target: { value: "Advanced" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

    await waitFor(() => {
      expect(createChoreography).toHaveBeenCalledWith(
        expect.objectContaining({ level: "Beginner", personal_level: "Advanced" }),
      );
    });
  });

  it("sends the chosen learning status with the create request", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(getLevels).mockResolvedValue([{ id: 1, name: "Beginner", value: 30 }]);
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByRole("option", { name: "Beginner" });

    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
    expect(screen.getByLabelText("Learning Status")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Learning Status"), { target: { value: "wishlist" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

    await waitFor(() => {
      expect(createChoreography).toHaveBeenCalledWith(
        expect.objectContaining({ level: "Beginner", learning_status: "wishlist" }),
      );
    });
  });

  it("shows a backend issue for the learning status next to the field after validation", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce(
      validationFailure([{ field: "learning_status", key: "invalid_learning_status" }]),
    );

    await renderAndSubmit();

    expect(await screen.findByText("Select a valid learning status.")).toBeInTheDocument();
    expect(screen.getByLabelText("Learning Status")).toHaveAccessibleDescription(
      "Select a valid learning status.",
    );
  });

  it("shows a backend issue for the personal level next to the field after validation", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce(
      validationFailure([{ field: "personal_level", key: "invalid_level" }]),
    );

    await renderAndSubmit();

    expect(await screen.findByText("Select a valid personal level.")).toBeInTheDocument();
    expect(screen.getByLabelText("Personal Level")).toHaveAccessibleDescription(
      "Select a valid personal level.",
    );
    expect(createChoreography).not.toHaveBeenCalled();
  });

  it("shows the effective level in the form title and follows the personal level", async () => {
    vi.mocked(getLevels).mockResolvedValue([
      { id: 1, name: "Beginner", value: 30 },
      { id: 2, name: "Advanced", value: 150 },
    ]);
    const { container } = render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByRole("option", { name: "Advanced" });
    const badge = () => container.querySelector(".choreography-form-context .level-badge");

    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
    expect(badge()).toHaveTextContent("Beginner");
    expect(badge()).not.toHaveAttribute("title");

    fireEvent.change(screen.getByLabelText("Personal Level"), { target: { value: "Advanced" } });
    expect(badge()).toHaveTextContent("Advanced");
    expect(badge()).toHaveAttribute("title", "Personal level (official: Beginner)");

    fireEvent.change(screen.getByLabelText("Personal Level"), { target: { value: "" } });
    expect(badge()).toHaveTextContent("Beginner");
    expect(badge()).not.toHaveAttribute("title");
  });

  it("provides six accessible tabs with arrow-key navigation", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByRole("option", { name: "Beginner" });
    expect(screen.getByRole("heading", { name: "Add New Choreography" })).toBeInTheDocument();
    expect(container.querySelector(".choreography-form-context")).toHaveTextContent(
      "Add New Choreography",
    );
    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    expect(screen.getByRole("heading", { name: "River Dance" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add New Choreography" })).not.toBeInTheDocument();
    expect(container.querySelector(".choreography-form-context .level-badge")).toBeNull();

    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
    expect(container.querySelector(".choreography-form-context .level-badge")).toHaveTextContent(
      "Beginner",
    );

    const basicTab = screen.getByRole("tab", { name: "Basic Information" });
    expect(screen.getAllByRole("tab")).toHaveLength(7);
    expect(basicTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("heading", { name: "Basic Information" })).not.toBeInTheDocument();

    fireEvent.keyDown(basicTab, { key: "ArrowRight" });

    const choreographersTab = screen.getByRole("tab", { name: "Choreographers" });
    expect(choreographersTab).toHaveAttribute("aria-selected", "true");
    expect(choreographersTab).toHaveFocus();
    expect(screen.queryByRole("heading", { name: "Choreographers" })).not.toBeInTheDocument();
  });

  it("marks invalid tabs without changing the selected tab on submit", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce(
      validationFailure([
        { field: "name", key: "required" },
        { field: "level", key: "required" },
        { field: "choreography_information.0.description", key: "required" },
      ]),
    );
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByRole("option", { name: "Beginner" });
    fireEvent.click(screen.getByRole("tab", { name: "Additional Information" }));
    fireEvent.change(screen.getByLabelText("Category 1"), {
      target: { value: "__create_new_category__" },
    });
    fireEvent.change(screen.getByLabelText("New category 1"), { target: { value: "Restart" } });
    fireEvent.click(screen.getByRole("tab", { name: "Hash Tags" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

    await screen.findByRole("tab", { name: "Basic Information, validation errors" });
    expect(screen.getByRole("tab", { name: "Hash Tags" })).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tab", { name: "Basic Information, validation errors" }),
    ).toHaveTextContent("⚠️");
    expect(
      screen.getByRole("tab", { name: "Additional Information, validation errors" }),
    ).toHaveTextContent("⚠️");
    expect(createChoreography).not.toHaveBeenCalled();
  });

  it("shows accessible required-field errors after saving and clears them when corrected", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(validateChoreography).mockRejectedValueOnce(
      validationFailure([
        { field: "name", key: "required" },
        { field: "level", key: "required" },
      ]),
    );
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByRole("option", { name: "Beginner" });
    const name = screen.getByLabelText("Choreography Name *");
    const level = screen.getByLabelText("Official Level *");
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(level).not.toHaveAttribute("aria-invalid");

    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    await screen.findByText("Select a level.");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Enter a choreography name.");
    expect(level).toHaveAttribute("aria-invalid", "true");
    expect(level).toHaveAccessibleDescription("Select a level.");
    expect(createChoreography).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: "River Dance" } });
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Enter a choreography name.")).not.toBeInTheDocument();
    fireEvent.change(level, { target: { value: "Beginner" } });
    expect(level).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Select a level.")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Basic Information" })).not.toHaveTextContent("⚠️");

    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    await waitFor(() => expect(createChoreography).toHaveBeenCalledOnce());
  });

  it("reports validation service failures without attempting to save", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce(new Error("network error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <MemoryRouter initialEntries={["/choreographies/new"]}>
          <Routes>
            <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await screen.findAllByRole("option", { name: "Beginner" });
      fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Failed to validate or save the choreography",
      );
      expect(checkChoreographyDuplicates).not.toHaveBeenCalled();
      expect(createChoreography).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not apply stale validation results after the form changes", async () => {
    let rejectValidation: (reason: unknown) => void = () => {};
    vi.mocked(validateChoreography).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectValidation = reject;
      }),
    );
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByRole("option", { name: "Beginner" });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "New name" },
    });
    await act(async () =>
      rejectValidation(validationFailure([{ field: "name", key: "required" }])),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("form changed during validation");
    expect(screen.getByLabelText("Choreography Name *")).not.toHaveAttribute("aria-invalid");
    expect(createChoreography).not.toHaveBeenCalled();
  });

  it("shows field issues returned by the create request after validation succeeded", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(createChoreography).mockRejectedValueOnce(
      validationFailure([{ field: "level", key: "invalid_level" }]),
    );
    await renderAndSubmit();
    expect(await screen.findByText("Select a valid level.")).toBeInTheDocument();
    expect(screen.getByLabelText("Official Level *")).toHaveAttribute("aria-invalid", "true");
  });

  it("sends decimal input unchanged and displays backend integer issues on each field", async () => {
    vi.mocked(validateChoreography).mockRejectedValueOnce(
      validationFailure([
        { field: "count", key: "invalid_integer" },
        { field: "wall_count", key: "invalid_integer" },
        { field: "creation_year", key: "invalid_integer" },
      ]),
    );
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByRole("option", { name: "Beginner" });
    const count = screen.getByLabelText("Count");
    fireEvent.change(count, { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    await screen.findByRole("tab", { name: "Basic Information, validation errors" });
    expect(validateChoreography).toHaveBeenCalledWith(expect.objectContaining({ count: 1.5 }));
    for (const label of ["Count", "Wall Count", "Year Created"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription("Enter a whole number.");
    }
    fireEvent.change(count, { target: { value: "0" } });
    expect(count).toHaveValue(0);
    expect(count).not.toHaveAttribute("aria-invalid");
  });

  it("marks invalid links and incomplete information rows across tabs and clears errors on correction", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    vi.mocked(validateChoreography).mockRejectedValueOnce(
      validationFailure([
        { field: "demo_video_url", key: "invalid_url" },
        { field: "choreography_information.0.description", key: "required" },
        { field: "choreography_information.1.category", key: "required" },
      ]),
    );
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByRole("option", { name: "Beginner" });
    fireEvent.change(screen.getByLabelText("Choreography Name *"), { target: { value: "Dance" } });
    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
    fireEvent.click(screen.getByRole("tab", { name: "Links" }));
    fireEvent.change(screen.getByLabelText("Demo Video URL"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("tab", { name: "Additional Information" }));
    fireEvent.change(screen.getByLabelText("Category 1"), { target: { value: "Restart" } });
    fireEvent.change(screen.getByLabelText("Description 2"), { target: { value: "Details" } });
    fireEvent.click(screen.getByRole("tab", { name: "Hash Tags" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    expect(createChoreography).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("tab", { name: "Links, validation errors" }));
    const link = screen.getByLabelText("Demo Video URL");
    expect(link).toHaveAttribute("aria-invalid", "true");
    expect(link).toHaveAccessibleDescription("Enter a valid URL.");
    expect(screen.getByLabelText("Step Sheet Link")).not.toHaveAttribute("aria-invalid");
    fireEvent.change(link, { target: { value: "https://example.com" } });
    expect(link).not.toHaveAttribute("aria-invalid");

    fireEvent.click(screen.getByRole("tab", { name: "Additional Information, validation errors" }));
    const description = screen.getByLabelText("Description 1");
    const category = screen.getByLabelText("Category 2");
    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAccessibleDescription("Enter a description.");
    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAccessibleDescription("Choose or enter a category.");
    expect(screen.getByLabelText("Category 3")).not.toHaveAttribute("aria-invalid");

    fireEvent.change(category, { target: { value: "__create_new_category__" } });
    const customCategory = screen.getByLabelText("New category 2");
    expect(customCategory).toHaveAttribute("aria-invalid", "true");
    expect(customCategory).toHaveAccessibleDescription("Choose or enter a category.");
    fireEvent.change(customCategory, { target: { value: "Styling" } });
    fireEvent.change(description, { target: { value: "After wall 3" } });
    expect(screen.getByRole("tab", { name: "Additional Information" })).not.toHaveTextContent("⚠️");
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));
    await waitFor(() => expect(createChoreography).toHaveBeenCalledOnce());
  });

  it("submits multiple-choice choreography information fields", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByRole("option", { name: "Beginner" });
    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    fireEvent.change(screen.getByLabelText("Official Level *"), { target: { value: "Beginner" } });
    fireEvent.click(screen.getByRole("tab", { name: "Additional Information" }));
    expect(screen.getByLabelText("Category 1")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Styling" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Category 1"), {
      target: { value: "__create_new_category__" },
    });
    fireEvent.change(screen.getByLabelText("New category 1"), { target: { value: "Mood" } });
    expect(screen.getByLabelText("Category 2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Description 1"), {
      target: { value: "Keep the movement light" },
    });
    fireEvent.change(screen.getByLabelText("Category 2"), { target: { value: "Restart" } });
    expect(screen.getByLabelText("Category 3")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Description 2"), {
      target: { value: "Restart after wall 3" },
    });
    const categoryInput = screen.getByLabelText("Category 1");
    const removeButton = screen.getByRole("button", { name: "Remove information 1" });
    expect(removeButton).toHaveTextContent("🗑️");
    expect(categoryInput.parentElement).toContainElement(removeButton);
    fireEvent.click(screen.getByRole("tab", { name: "Basic Information" }));
    fireEvent.click(screen.getByRole("tab", { name: "Additional Information" }));
    expect(screen.getByLabelText("Description 1")).toHaveValue("Keep the movement light");
    fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

    await waitFor(() => {
      expect(createChoreography).toHaveBeenCalledWith(
        expect.objectContaining({
          choreography_information: [
            { category: "Mood", description: "Keep the movement light" },
            { category: "Restart", description: "Restart after wall 3" },
            { category: "", description: "" },
          ],
        }),
      );
    });
  });

  describe("songs tab", () => {
    async function openSongsTab() {
      vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
      render(
        <MemoryRouter initialEntries={["/choreographies/new"]}>
          <Routes>
            <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await screen.findAllByRole("option", { name: "Beginner" });
      fireEvent.change(screen.getByLabelText("Choreography Name *"), {
        target: { value: "River Dance" },
      });
      fireEvent.change(screen.getByLabelText("Official Level *"), {
        target: { value: "Beginner" },
      });
      fireEvent.click(screen.getByRole("tab", { name: "Songs" }));
    }

    it("adds an empty row as soon as a song is entered and offers a favorite only for several songs", async () => {
      await openSongsTab();

      expect(screen.getByLabelText("Title 1")).toBeInTheDocument();
      expect(screen.queryByLabelText("Title 2")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Remove song/ })).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Title 1"), { target: { value: "Main Song" } });
      expect(screen.getByLabelText("Title 2")).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Favorite/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove song 1" })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Title 2"), { target: { value: "Alternative" } });
      expect(screen.getByLabelText("Title 3")).toBeInTheDocument();
      const [first, second] = screen.getAllByRole("radio");
      expect(first).toBeChecked();
      fireEvent.click(second);
      expect(second).toBeChecked();
      expect(first).not.toBeChecked();
    });

    it("saves songs with links, the favorite and without placeholder ids", async () => {
      vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
      await openSongsTab();

      fireEvent.change(screen.getByLabelText("Title 1"), { target: { value: "Main Song" } });
      fireEvent.change(screen.getByLabelText("Artist 1"), { target: { value: "Artist" } });
      fireEvent.change(screen.getByLabelText("YouTube link 1 (optional)"), {
        target: { value: "https://youtu.be/1" },
      });
      fireEvent.change(screen.getByLabelText("Title 2"), { target: { value: "Alternative" } });
      fireEvent.click(screen.getAllByRole("radio")[1]);
      fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

      await waitFor(() => {
        expect(createChoreography).toHaveBeenCalledOnce();
      });
      const songs = vi.mocked(createChoreography).mock.calls[0][0].choreography_songs;
      expect(songs?.slice(0, 2)).toEqual([
        {
          title: "Main Song",
          artist: "Artist",
          youtube_url: "https://youtu.be/1",
          spotify_url: "",
          note: "",
          bpm: "",
          length_seconds: "",
          genre: "",
          is_favorite: false,
        },
        {
          title: "Alternative",
          artist: "",
          youtube_url: "",
          spotify_url: "",
          note: "",
          bpm: "",
          length_seconds: "",
          genre: "",
          is_favorite: true,
        },
      ]);
    });

    it("saves BPM, genre and the length as seconds", async () => {
      vi.mocked(getGenres).mockResolvedValue(["Country"]);
      await openSongsTab();
      fireEvent.change(screen.getByLabelText("Title 1"), { target: { value: "Song" } });
      fireEvent.change(screen.getByLabelText("BPM 1 (optional)"), { target: { value: " 120 " } });
      fireEvent.change(screen.getByLabelText("Length 1 (optional)"), { target: { value: "3:45" } });
      fireEvent.change(screen.getByLabelText("Genre 1 (optional)"), {
        target: { value: "Country" },
      });
      await waitFor(() => {
        expect(
          document.querySelector('#choreography-song-genres option[value="Country"]'),
        ).not.toBeNull();
      });
      fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

      await waitFor(() => {
        expect(createChoreography).toHaveBeenCalledOnce();
      });
      expect(vi.mocked(createChoreography).mock.calls[0][0].choreography_songs?.[0]).toMatchObject({
        title: "Song",
        bpm: 120,
        length_seconds: 225,
        genre: "Country",
      });
    });

    it("validates BPM and length as numbers, like they are saved", async () => {
      await openSongsTab();
      fireEvent.change(screen.getByLabelText("Title 1"), { target: { value: "Song" } });
      fireEvent.change(screen.getByLabelText("BPM 1 (optional)"), { target: { value: "124" } });
      fireEvent.change(screen.getByLabelText("Length 1 (optional)"), { target: { value: "3:14" } });
      fireEvent.click(screen.getByRole("tab", { name: "Basic Information" }));
      fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

      await waitFor(() => {
        expect(validateChoreography).toHaveBeenCalledOnce();
      });
      expect(
        vi.mocked(validateChoreography).mock.calls[0][0].choreography_songs?.[0],
      ).toMatchObject({ bpm: 124, length_seconds: 194 });
    });

    it("sends text that is not a length unchanged and shows the backend issue", async () => {
      vi.mocked(validateChoreography).mockRejectedValueOnce(
        validationFailure([
          { field: "choreography_songs.0.bpm", key: "invalid_integer" },
          { field: "choreography_songs.0.length_seconds", key: "invalid_integer" },
        ]),
      );
      await openSongsTab();
      fireEvent.change(screen.getByLabelText("Title 1"), { target: { value: "Song" } });
      fireEvent.change(screen.getByLabelText("BPM 1 (optional)"), { target: { value: "fast" } });
      fireEvent.change(screen.getByLabelText("Length 1 (optional)"), { target: { value: "225" } });
      fireEvent.click(screen.getByRole("tab", { name: "Basic Information" }));
      fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

      fireEvent.click(await screen.findByRole("tab", { name: "Songs, validation errors" }));
      const bpm = screen.getByLabelText("BPM 1 (optional)");
      const length = screen.getByLabelText("Length 1 (optional)");
      expect(bpm).toHaveAttribute("aria-invalid", "true");
      expect(bpm).toHaveAccessibleDescription("Enter a whole number from 30 to 300.");
      expect(length).toHaveAttribute("aria-invalid", "true");
      expect(length).toHaveAccessibleDescription(
        "Enter the length as m:ss, e.g. 3:45 (up to 60:00).",
      );
      expect(createChoreography).not.toHaveBeenCalled();

      fireEvent.change(bpm, { target: { value: "120" } });
      expect(bpm).not.toHaveAttribute("aria-invalid");
      expect(length).toHaveAttribute("aria-invalid", "true");
    });

    it("removes a song and keeps a trailing empty row", async () => {
      await openSongsTab();
      fireEvent.change(screen.getByLabelText("Title 1"), { target: { value: "A" } });
      fireEvent.change(screen.getByLabelText("Title 2"), { target: { value: "B" } });
      fireEvent.click(screen.getByRole("button", { name: "Remove song 1" }));

      expect(screen.getByLabelText("Title 1")).toHaveValue("B");
      expect(screen.getByLabelText("Title 2")).toHaveValue("");
      expect(screen.queryByLabelText("Title 3")).not.toBeInTheDocument();
    });

    it("shows backend issues next to the song fields and clears them on correction", async () => {
      vi.mocked(validateChoreography).mockRejectedValueOnce(
        validationFailure([
          { field: "choreography_songs.0.title", key: "required" },
          { field: "choreography_songs.0.youtube_url", key: "invalid_url" },
        ]),
      );
      await openSongsTab();
      fireEvent.change(screen.getByLabelText("Artist 1"), { target: { value: "Artist" } });
      fireEvent.change(screen.getByLabelText("YouTube link 1 (optional)"), {
        target: { value: "nope" },
      });
      fireEvent.click(screen.getByRole("tab", { name: "Basic Information" }));
      fireEvent.click(screen.getByRole("button", { name: "Save Choreography" }));

      fireEvent.click(await screen.findByRole("tab", { name: "Songs, validation errors" }));
      const title = screen.getByLabelText("Title 1");
      const link = screen.getByLabelText("YouTube link 1 (optional)");
      expect(title).toHaveAttribute("aria-invalid", "true");
      expect(title).toHaveAccessibleDescription("Enter a song title.");
      expect(link).toHaveAttribute("aria-invalid", "true");
      expect(link).toHaveAccessibleDescription("Enter a valid http(s) link.");
      expect(createChoreography).not.toHaveBeenCalled();

      fireEvent.change(title, { target: { value: "Song" } });
      expect(title).not.toHaveAttribute("aria-invalid");
      expect(link).toHaveAttribute("aria-invalid", "true");
    });
  });
});
