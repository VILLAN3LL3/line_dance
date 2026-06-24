import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@testing-library/react";

import { DuplicateChoreographyWarning } from "../../components/choreographies/DuplicateChoreographyWarning";

import type { DuplicateChoreography } from "../../types";

const singleDuplicate: DuplicateChoreography[] = [
  { id: 7, name: "River Dance", level: "BEGINNER", authors: ["Alice", "Bob"] },
];

function renderWarning(
  duplicates: DuplicateChoreography[],
  onConfirm = vi.fn(),
  onCancel = vi.fn(),
) {
  render(
    <MemoryRouter>
      <DuplicateChoreographyWarning
        duplicates={duplicates}
        onConfirm={onConfirm}
        onCancel={onCancel} // NOSONAR
      />
    </MemoryRouter>,
  );
  return { onConfirm, onCancel };
}

describe("DuplicateChoreographyWarning", () => {
  it("renders the duplicate name as a link to the choreography detail", () => {
    renderWarning(singleDuplicate);

    const link = screen.getByRole("link", { name: "River Dance" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/choreographies/7");
  });

  it("renders level and authors next to the link", () => {
    renderWarning(singleDuplicate);

    expect(screen.getByText(/BEGINNER/)).toBeInTheDocument();
    expect(screen.getByText(/Alice, Bob/)).toBeInTheDocument();
  });

  it("uses singular heading for one duplicate", () => {
    renderWarning(singleDuplicate);

    expect(screen.getByText(/Possible duplicate found/)).toBeInTheDocument();
  });

  it("uses plural heading for multiple duplicates", () => {
    const two: DuplicateChoreography[] = [
      { id: 7, name: "River Dance", level: "BEGINNER", authors: ["Alice"] },
      { id: 8, name: "River Dance", level: "BEGINNER", authors: ["Alice"] },
    ];
    renderWarning(two);

    expect(screen.getByText(/Possible duplicates found/)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("calls onConfirm when Save anyway is clicked", () => {
    const { onConfirm } = renderWarning(singleDuplicate);

    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const { onCancel } = renderWarning(singleDuplicate);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
