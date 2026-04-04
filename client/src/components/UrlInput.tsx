import "../styles/UrlInput.css";

import React, { useState } from "react";

import { checkUrl } from "../api";

interface UrlInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}

type UrlCheckStatus = "idle" | "checking" | "ok" | "error";

export const UrlInput: React.FC<UrlInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [status, setStatus] = useState<UrlCheckStatus>("idle");

  const handleFocus = () => {
    setStatus("idle");
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();

    if (!trimmed) {
      setStatus("idle");
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setStatus("error");
      return;
    }

    setStatus("checking");
    try {
      const result = await checkUrl(trimmed);
      setStatus(result.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="url-input-wrapper">
      <input
        type="url"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
      />
      {status === "checking" && (
        <span className="url-status-indicator checking" aria-label="Checking URL" />
      )}
      {status === "ok" && (
        <span className="url-status-indicator ok" aria-label="URL reachable">
          ✓
        </span>
      )}
      {status === "error" && (
        <span className="url-status-indicator error" aria-label="URL not reachable">
          ✗
        </span>
      )}
    </div>
  );
};
