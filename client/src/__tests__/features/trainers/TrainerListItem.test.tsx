import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@testing-library/react";

import { TrainerListItem } from "../../../features/trainers/views/TrainerListItem";

const trainer = {
  id: 7,
  name: "Ann",
  phone: "123",
  email: "ann@example.com",
  created_at: "2024-01-01",
};
const baseProps = {
  trainer,
  isBusy: false,
  editValues: { name: "", phone: "", email: "", gender: "" as const },
  onEditValuesChange: vi.fn(),
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
};

describe("TrainerListItem", () => {
  it("shows trainer details and triggers edit and delete", () => {
    const onStartEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TrainerListItem
        {...baseProps}
        isEditing={false}
        onStartEdit={onStartEdit}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText("ann@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onStartEdit).toHaveBeenCalledWith(trainer);
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it("emits field patches and save in edit mode", () => {
    const onEditValuesChange = vi.fn();
    const onSave = vi.fn();
    render(
      <TrainerListItem
        {...baseProps}
        isEditing
        editValues={{ name: "Ann", phone: "123", email: "ann@example.com", gender: "" }}
        onEditValuesChange={onEditValuesChange}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Ann"), { target: { value: "Anne" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditValuesChange).toHaveBeenCalledWith({ name: "Anne" });
    expect(onSave).toHaveBeenCalledWith(7);
  });

  it("shows the gender and emits a patch when it is changed", () => {
    const onEditValuesChange = vi.fn();
    const { rerender } = render(
      <TrainerListItem
        {...baseProps}
        trainer={{ ...trainer, gender: "female" }}
        isEditing={false}
      />,
    );
    expect(screen.getByText("Female")).toBeInTheDocument();

    rerender(
      <TrainerListItem
        {...baseProps}
        isEditing
        editValues={{ name: "Ann", phone: "1", email: "a@b.c", gender: "female" }}
        onEditValuesChange={onEditValuesChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Trainer gender" }), {
      target: { value: "diverse" },
    });
    expect(onEditValuesChange).toHaveBeenCalledWith({ gender: "diverse" });
  });
});
