import "../../styles/ActionMenu.css";

import React, { useId, useRef, useState } from "react";

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
}

interface ActionMenuProps {
  label: string;
  items: ActionMenuItem[];
  disabled?: boolean;
}

/** A button that opens a small menu of actions; closes on selection, Escape or focus loss. */
export const ActionMenu: React.FC<ActionMenuProps> = ({ label, items, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !isOpen) return;
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="action-menu" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <button
        ref={toggleRef}
        type="button"
        className="btn-secondary action-menu__toggle"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        {label} <span aria-hidden="true">▾</span>
      </button>
      {isOpen && !disabled && (
        <div id={menuId} role="menu" className="action-menu__list">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="action-menu__item"
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
