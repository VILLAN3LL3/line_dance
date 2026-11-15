import "../../../styles/UrlInput.css";

import React from "react";

import { useUrlCheck } from "../viewmodels/useUrlCheck";

interface UrlInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  error,
}) => {
  const { state, actions } = useUrlCheck();

  return (
    <div className="url-input-wrapper">
      <input
        type="url"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={actions.reset}
        onBlur={(e) => void actions.check(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {state.status === "checking" && (
        <span className="url-status-indicator checking" aria-label="Checking URL" />
      )}
      {state.status === "ok" && (
        <span className="url-status-indicator ok" aria-label="URL reachable">
          ✓
        </span>
      )}
      {state.status === "error" && (
        <span className="url-status-indicator error" aria-label="URL not reachable">
          ✗
        </span>
      )}
    </div>
  );
};
