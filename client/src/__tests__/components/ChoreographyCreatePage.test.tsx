import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  checkChoreographyDuplicates,
  createChoreography,
  getAuthors,
  getChoreographyInfoCategories,
  getLevels,
  getStepFigures,
  getTags,
  validateChoreography,
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
  getChoreographyInfoCategories: vi.fn(),
  getLevels: vi.fn(),
  getStepFigures: vi.fn(),
  getTags: vi.fn(),
  validateChoreography: vi.fn(),
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

  it("provides six accessible tabs with arrow-key navigation", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/choreographies/new"]}>
        <Routes>
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("option", { name: "Beginner" });
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

    fireEvent.change(screen.getByLabelText("Level *"), { target: { value: "Beginner" } });
    expect(container.querySelector(".choreography-form-context .level-badge")).toHaveTextContent(
      "Beginner",
    );

    const basicTab = screen.getByRole("tab", { name: "Basic Information" });
    expect(screen.getAllByRole("tab")).toHaveLength(6);
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

    await screen.findByRole("option", { name: "Beginner" });
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

    await screen.findByRole("option", { name: "Beginner" });
    const name = screen.getByLabelText("Choreography Name *");
    const level = screen.getByLabelText("Level *");
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
      await screen.findByRole("option", { name: "Beginner" });
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
    await screen.findByRole("option", { name: "Beginner" });
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
    expect(screen.getByLabelText("Level *")).toHaveAttribute("aria-invalid", "true");
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

    await screen.findByRole("option", { name: "Beginner" });
    fireEvent.change(screen.getByLabelText("Choreography Name *"), { target: { value: "Dance" } });
    fireEvent.change(screen.getByLabelText("Level *"), { target: { value: "Beginner" } });
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

    await screen.findByRole("option", { name: "Beginner" });
    fireEvent.change(screen.getByLabelText("Choreography Name *"), {
      target: { value: "River Dance" },
    });
    fireEvent.change(screen.getByLabelText("Level *"), { target: { value: "Beginner" } });
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
});
