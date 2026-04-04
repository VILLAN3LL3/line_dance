import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getStepFigures } from "../../api";
import { ChoreographyTable } from "../../components/choreographies/ChoreographyTable";

import type { Choreography } from "../../types";
vi.mock("../../api", () => ({
  getStepFigures: vi.fn(),
}));

const mockGetStepFigures = vi.mocked(getStepFigures);

function makeChoreo(overrides: Partial<Choreography> = {}): Choreography {
  return {
    id: 1,
    name: "Alpha Dance",
    level: "Beginner",
    count: 16,
    wall_count: 2,
    creation_year: 2020,
    authors: [],
    tags: ["a"],
    step_figures: ["Mambo"],
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ChoreographyTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetStepFigures.mockResolvedValue(["Mambo", "Cha Cha"]);
  });

  it("loads step-figure columns from API and renders rows", async () => {
    render(<ChoreographyTable choreographies={[makeChoreo()]} />);

    await waitFor(() => {
      expect(mockGetStepFigures).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Alpha Dance")).toBeInTheDocument();
    expect(screen.getByTitle("Mambo")).toBeInTheDocument();
    expect(screen.getByTitle("Cha Cha")).toBeInTheDocument();
  });

  it("calls onSelect when row is clicked", async () => {
    const onSelect = vi.fn();
    render(<ChoreographyTable choreographies={[makeChoreo({ id: 10 })]} onSelect={onSelect} />);

    await waitFor(() => {
      expect(mockGetStepFigures).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByText("Alpha Dance")[0].closest("tr") || document.body);
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it("calls onEdit/onDelete and does not bubble to onSelect", async () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ChoreographyTable
        choreographies={[makeChoreo({ id: 11 })]}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await waitFor(() => {
      expect(mockGetStepFigures).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByTitle("Edit")[0]);
    fireEvent.click(screen.getAllByTitle("Delete")[0]);

    expect(onEdit).toHaveBeenCalledWith(11);
    expect(onDelete).toHaveBeenCalledWith(11);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("opens external links from action buttons", async () => {
    const openSpy = vi.spyOn(globalThis, "open").mockImplementation(() => null);

    render(
      <ChoreographyTable
        choreographies={[
          makeChoreo({
            step_sheet_link: "https://example.com/sheet",
            demo_video_url: "https://example.com/demo",
            tutorial_video_url: "https://example.com/tutorial",
          }),
        ]}
      />,
    );

    await waitFor(() => {
      expect(mockGetStepFigures).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTitle("Open Step Sheet"));
    fireEvent.click(screen.getByTitle("Open Demo Video"));
    fireEvent.click(screen.getByTitle("Open Tutorial Video"));

    expect(openSpy).toHaveBeenNthCalledWith(1, "https://example.com/sheet", "_blank");
    expect(openSpy).toHaveBeenNthCalledWith(2, "https://example.com/demo", "_blank");
    expect(openSpy).toHaveBeenNthCalledWith(3, "https://example.com/tutorial", "_blank");
  });
});
