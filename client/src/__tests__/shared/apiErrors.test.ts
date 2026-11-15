import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "../../shared/http/apiErrors";

describe("getApiErrorMessage", () => {
  it("extracts a non-empty server error message from an Axios error", () => {
    const error = new AxiosError("request failed");
    Object.defineProperty(error, "response", {
      value: { data: { error: "The level already exists" } },
    });

    expect(getApiErrorMessage(error)).toBe("The level already exists");
  });

  it("returns null for non-Axios errors and invalid response messages", () => {
    const error = new AxiosError("request failed");
    Object.defineProperty(error, "response", {
      value: { data: { error: 400 } },
    });

    expect(getApiErrorMessage(new Error("request failed"))).toBeNull();
    expect(getApiErrorMessage(error)).toBeNull();
  });
});
