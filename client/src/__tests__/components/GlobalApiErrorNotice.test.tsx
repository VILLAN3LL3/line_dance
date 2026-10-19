import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GlobalApiErrorNotice } from "../../components/shared/GlobalApiErrorNotice";
import { DATABASE_RESTARTING_EVENT, reportGlobalApiError } from "../../utils/apiErrors";

describe("GlobalApiErrorNotice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows and dismisses a database-restarting error from any API request", () => {
    render(<GlobalApiErrorNotice />);

    const listener = vi.fn();
    window.addEventListener(DATABASE_RESTARTING_EVENT, listener);

    act(() => {
      reportGlobalApiError(
        Object.assign(new Error("Request failed"), {
          isAxiosError: true,
          response: {
            status: 503,
            data: { code: "DATABASE_RESTARTING" },
          },
        }),
      );
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(/reconnecting to its database/i);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss database warning" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    window.removeEventListener(DATABASE_RESTARTING_EVENT, listener);
  });
});
