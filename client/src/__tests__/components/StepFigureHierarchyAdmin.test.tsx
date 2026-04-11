import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  createStepFigureDefinition,
  deleteStepFigureDefinition,
  getStepFigureHierarchy,
  updateStepFigureDefinition,
} from "../../api";
import StepFigureHierarchyAdmin from "../../components/choreographies/StepFigureHierarchyAdmin";

vi.mock("../../api", () => ({
  getStepFigureHierarchy: vi.fn(),
  createStepFigureDefinition: vi.fn(),
  updateStepFigureDefinition: vi.fn(),
  deleteStepFigureDefinition: vi.fn(),
}));

describe("StepFigureHierarchyAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getStepFigureHierarchy).mockResolvedValue([
      {
        id: 1,
        name: "Rock Step",
        components: [],
        parents: [],
        used_by_choreography_count: 2,
      },
      {
        id: 2,
        name: "Weave Combo",
        components: [{ id: 1, name: "Rock Step" }],
        parents: [],
        used_by_choreography_count: 0,
      },
    ]);

    vi.mocked(createStepFigureDefinition).mockResolvedValue({
      id: 3,
      name: "Kick Ball Change",
      components: [],
      parents: [],
      used_by_choreography_count: 0,
    });

    vi.mocked(updateStepFigureDefinition).mockResolvedValue({
      id: 1,
      name: "Rock Step Updated",
      components: [],
      parents: [],
      used_by_choreography_count: 2,
    });

    vi.mocked(deleteStepFigureDefinition).mockResolvedValue({ message: "ok" });
  });

  it("loads the hierarchy catalog and selects the first step figure", async () => {
    render(<StepFigureHierarchyAdmin />);

    await waitFor(() => {
      expect(getStepFigureHierarchy).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: /rock step/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Rock Step")).toBeInTheDocument();
    });
    expect(screen.getAllByText("2 choreographies").length).toBeGreaterThan(0);
  });

  it("creates and updates step figures from the admin page", async () => {
    render(<StepFigureHierarchyAdmin />);

    await waitFor(() => {
      expect(getStepFigureHierarchy).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText(/weave combination/i), {
      target: { value: "Kick Ball Change" },
    });
    fireEvent.change(screen.getAllByPlaceholderText(/add component step figure/i)[0], {
      target: { value: "Rock Step" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /add component/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /create step figure/i }));

    await waitFor(() => {
      expect(createStepFigureDefinition).toHaveBeenCalledWith({
        name: "Kick Ball Change",
        component_ids: [1],
      });
    });

    fireEvent.change(screen.getByDisplayValue("Rock Step"), {
      target: { value: "Rock Step Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateStepFigureDefinition).toHaveBeenCalledWith(1, {
        name: "Rock Step Updated",
        component_ids: [],
      });
    });
  });
});