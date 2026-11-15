import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { checkUrl } from "../../../features/url-check/api";
import { useUrlCheck } from "../../../features/url-check/viewmodels/useUrlCheck";
import { UrlInput as UrlInputView } from "../../../features/url-check/views/UrlInput";
import type { ComponentProps } from "react";

vi.mock("../../../features/url-check/api", () => ({
  checkUrl: vi.fn(),
}));

const mockCheckUrl = checkUrl as Mock;

const UrlInputHarness = (props: Omit<ComponentProps<typeof UrlInputView>, "viewModel">) => (
  <UrlInputView {...props} viewModel={useUrlCheck()} />
);

function renderUrlInput(value = "") {
  const onChange = vi.fn();
  render(
    <UrlInputHarness
      id="test-url"
      name="test_url"
      value={value}
      onChange={onChange}
      placeholder="https://example.com"
    />,
  );
  return { onChange };
}

function getInput() {
  return screen.getByRole("textbox");
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// idle state
// ---------------------------------------------------------------------------

describe("UrlInput — idle state", () => {
  it("renders the input with no status indicator initially", () => {
    renderUrlInput();

    expect(getInput()).toBeInTheDocument();
    expect(screen.queryByLabelText("Checking URL")).toBeNull();
    expect(screen.queryByLabelText("URL reachable")).toBeNull();
    expect(screen.queryByLabelText("URL not reachable")).toBeNull();
  });

  it("clears any indicator when the input is focused", async () => {
    mockCheckUrl.mockResolvedValueOnce({ ok: true, status: 200 });
    renderUrlInput("https://example.com");

    fireEvent.blur(getInput());
    await waitFor(() => expect(screen.queryByLabelText("URL reachable")).toBeInTheDocument());

    fireEvent.focus(getInput());
    expect(screen.queryByLabelText("URL reachable")).toBeNull();
  });

  it("shows no indicator when blurring an empty field", async () => {
    renderUrlInput("");
    fireEvent.blur(getInput());
    await waitFor(() => {
      expect(screen.queryByLabelText("Checking URL")).toBeNull();
      expect(screen.queryByLabelText("URL reachable")).toBeNull();
      expect(screen.queryByLabelText("URL not reachable")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// invalid URL format
// ---------------------------------------------------------------------------

describe("UrlInput — invalid URL format", () => {
  it("shows error indicator without calling fetch when the value is not a valid URL", async () => {
    renderUrlInput("not-a-url");
    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText("URL not reachable")).toBeInTheDocument());
    expect(mockCheckUrl).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reachability check — ok
// ---------------------------------------------------------------------------

describe("UrlInput — reachability check success", () => {
  it.each([
    ["a regular URL", "https://example.com", "https://example.com"],
    ["a trimmed URL", "  https://example.com/path  ", "https://example.com/path"],
    [
      "a cross-origin URL",
      "https://www.copperknob.co.uk/stepsheets/example",
      "https://www.copperknob.co.uk/stepsheets/example",
    ],
  ])("shows a tick and checks %s", async (_label, value, expectedUrl) => {
    mockCheckUrl.mockResolvedValueOnce({ ok: true, status: 200 });
    renderUrlInput(value);

    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText("URL reachable")).toBeInTheDocument());
    expect(mockCheckUrl).toHaveBeenCalledWith(expectedUrl);
  });
});

// ---------------------------------------------------------------------------
// reachability check — error
// ---------------------------------------------------------------------------

describe("UrlInput — reachability check failure", () => {
  it("shows error indicator when the server responds with a non-ok status (e.g. 404)", async () => {
    mockCheckUrl.mockResolvedValueOnce({ ok: false, status: 404 });
    renderUrlInput("https://example.com/missing");

    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText("URL not reachable")).toBeInTheDocument());
    expect(screen.queryByLabelText("URL reachable")).toBeNull();
  });

  it("shows error indicator when checkUrl throws (network error / timeout)", async () => {
    mockCheckUrl.mockRejectedValueOnce(new Error("network error"));
    renderUrlInput("https://example.com");

    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText("URL not reachable")).toBeInTheDocument());
  });
});
