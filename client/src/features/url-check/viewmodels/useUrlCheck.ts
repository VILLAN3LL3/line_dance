import { useState } from "react";

import { checkUrl } from "../api";
import { isValidUrl, type UrlCheckStatus } from "../model/url-check";

/** Checks on demand whether a URL is well-formed and reachable (used when an input loses focus). */
export const useUrlCheck = () => {
  const [status, setStatus] = useState<UrlCheckStatus>("idle");

  const reset = () => setStatus("idle");

  const check = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus("idle");
      return;
    }
    if (!isValidUrl(trimmed)) {
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

  return { state: { status }, actions: { check, reset } };
};
