import React from "react";

interface CheckboxFilterProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const CheckboxFilter: React.FC<CheckboxFilterProps> = ({
  checked,
  onChange,
  disabled = false,
  children,
}) => (
  <label className="status-filter">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
    />{" "}
    {children}
  </label>
);
