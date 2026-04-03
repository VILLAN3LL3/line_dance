import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UrlInput } from "../../components/UrlInput";

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function renderUrlInput(value = '') {
  const onChange = vi.fn();
  render(
    <UrlInput
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
  return screen.getByRole('textbox');
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// idle state
// ---------------------------------------------------------------------------

describe('UrlInput — idle state', () => {
  it('renders the input with no status indicator initially', () => {
    renderUrlInput();

    expect(getInput()).toBeInTheDocument();
    expect(screen.queryByLabelText('Checking URL')).toBeNull();
    expect(screen.queryByLabelText('URL reachable')).toBeNull();
    expect(screen.queryByLabelText('URL not reachable')).toBeNull();
  });

  it('clears any indicator when the input is focused', async () => {
    mockFetch.mockResolvedValueOnce(new Response());
    renderUrlInput('https://example.com');

    fireEvent.blur(getInput());
    await waitFor(() => expect(screen.queryByLabelText('URL reachable')).toBeInTheDocument());

    fireEvent.focus(getInput());
    expect(screen.queryByLabelText('URL reachable')).toBeNull();
  });

  it('shows no indicator when blurring an empty field', async () => {
    renderUrlInput('');
    fireEvent.blur(getInput());
    await waitFor(() => {
      expect(screen.queryByLabelText('Checking URL')).toBeNull();
      expect(screen.queryByLabelText('URL reachable')).toBeNull();
      expect(screen.queryByLabelText('URL not reachable')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// invalid URL format
// ---------------------------------------------------------------------------

describe('UrlInput — invalid URL format', () => {
  it('shows error indicator without calling fetch when the value is not a valid URL', async () => {
    renderUrlInput('not-a-url');
    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText('URL not reachable')).toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reachability check — ok
// ---------------------------------------------------------------------------

describe('UrlInput — reachability check success', () => {
  it('shows tick mark after fetch resolves for a valid URL', async () => {
    mockFetch.mockResolvedValueOnce(new Response());
    renderUrlInput('https://example.com');

    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText('URL reachable')).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ mode: 'no-cors' }),
    );
  });

  it('passes the exact trimmed URL to fetch', async () => {
    mockFetch.mockResolvedValueOnce(new Response());
    renderUrlInput('  https://example.com/path  ');

    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText('URL reachable')).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/path',
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// reachability check — error
// ---------------------------------------------------------------------------

describe('UrlInput — reachability check failure', () => {
  it('shows error indicator when fetch throws (network error / timeout)', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('network error'));
    renderUrlInput('https://example.com');

    fireEvent.blur(getInput());

    await waitFor(() => expect(screen.getByLabelText('URL not reachable')).toBeInTheDocument());
  });
});
