import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@testing-library/react";

import { ActionMenu } from "../../shared/ui";

const renderMenu = (props: { disabled?: boolean } = {}) => {
  const onFirst = vi.fn();
  const onSecond = vi.fn();
  render(
    <>
      <ActionMenu
        label="Export"
        items={[
          { label: "First", onSelect: onFirst },
          { label: "Second", onSelect: onSecond },
        ]}
        {...props}
      />
      <button type="button">Outside</button>
    </>,
  );
  return { onFirst, onSecond, toggle: screen.getByRole("button", { name: /Export/ }) };
};

describe("ActionMenu", () => {
  it("is closed initially and opens and closes via the toggle", () => {
    const { toggle } = renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "First",
      "Second",
    ]);

    fireEvent.click(toggle);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("runs the selected action and closes the menu", () => {
    const { toggle, onFirst, onSecond } = renderMenu();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("menuitem", { name: "Second" }));
    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the toggle", () => {
    const { toggle } = renderMenu();
    fireEvent.click(toggle);
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "First" }), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("closes when focus leaves the menu but not when it moves between its items", () => {
    const { toggle } = renderMenu();
    fireEvent.click(toggle);
    const first = screen.getByRole("menuitem", { name: "First" });
    fireEvent.blur(toggle, { relatedTarget: first });
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.blur(first, { relatedTarget: screen.getByRole("button", { name: "Outside" }) });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not open while disabled", () => {
    const { toggle } = renderMenu({ disabled: true });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
