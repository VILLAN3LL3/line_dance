import "../../../styles/UrlInput.css";

import React from "react";

import type { UrlCheckViewModel } from "../viewmodels/useUrlCheck";

interface UrlInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  viewModel: UrlCheckViewModel;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  viewModel,
}) => {
  return (
    <div className="url-input-wrapper">
      <input
        type="url"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={viewModel.actions.reset}
        onBlur={(e) => void viewModel.actions.check(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {viewModel.state.status === "checking" && (
        <span className="url-status-indicator checking" aria-label="Checking URL" />
      )}
      {viewModel.state.status === "ok" && (
        <span className="url-status-indicator ok" aria-label="URL reachable">
          ✓
        </span>
      )}
      {viewModel.state.status === "error" && (
        <span className="url-status-indicator error" aria-label="URL not reachable">
          ✗
        </span>
      )}
    </div>
  );
};
