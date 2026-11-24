import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import { searchChoreographies } from "../../../features/choreographies/api";
import {
  deletePracticeEntry,
  fetchPracticeLog,
  fetchPracticeSuggestions,
  logPractice,
} from "../../../features/practice/api";
import { usePracticeDeckViewModel } from "../../../features/practice/viewmodels/usePracticeDeckViewModel";
import { usePracticeLogViewModel } from "../../../features/practice/viewmodels/usePracticeLogViewModel";
import { useQuickLogViewModel } from "../../../features/practice/viewmodels/useQuickLogViewModel";
import { createQueryWrapper } from "../../helpers/renderWithQueryClient";
import { makeDance, makeSummary } from "./testData";

vi.mock("../../../features/choreographies/api", () => ({ searchChoreographies: vi.fn() }));
vi.mock("../../../features/practice/api", () => ({
  fetchPracticeSuggestions: vi.fn(),
  fetchPracticeLog: vi.fn(),
  logPractice: vi.fn(),
  deletePracticeEntry: vi.fn(),
}));

const learned = [makeDance(1, "Alpha"), makeDance(2, "Beta")];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchChoreographies).mockResolvedValue({
    data: learned,
    pagination: { page: 1, limit: 2, total: 2, totalPages: 1 },
  });
  vi.mocked(fetchPracticeSuggestions).mockResolvedValue([
    makeSummary(2),
    makeSummary(1, { is_due: false, next_due_on: "2999-01-01", practice_count: 1 }),
  ]);
  vi.mocked(fetchPracticeLog).mockResolvedValue([]);
  vi.mocked(logPractice).mockResolvedValue({ logged: 1, practiced_on: "2026-11-24" });
  vi.mocked(deletePracticeEntry).mockResolvedValue({ message: "ok" });
});

describe("usePracticeDeckViewModel", () => {
  it("builds the deck from the learned dances and the suggestions", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePracticeDeckViewModel(), { wrapper });
    expect(result.current.state.isLoading).toBe(true);
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.deck.due.map((card) => card.choreography.name)).toEqual(["Beta"]);
    expect(result.current.state.deck.later.map((card) => card.choreography.name)).toEqual([
      "Alpha",
    ]);
  });

  it("logs a practice for the card and refreshes the suggestions", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePracticeDeckViewModel(), { wrapper });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(() =>
      result.current.actions.practice(learned[1], {
        practicedOn: "2026-11-20",
        confidence: "unsure",
        note: " restart ",
        songId: null,
      }),
    );

    expect(logPractice).toHaveBeenCalledWith({
      choreography_ids: [2],
      practiced_on: "2026-11-20",
      confidence: "unsure",
      note: "restart",
    });
    await waitFor(() => expect(fetchPracticeSuggestions).toHaveBeenCalledTimes(2));
  });

  it("reports load and save failures", async () => {
    vi.mocked(fetchPracticeSuggestions).mockRejectedValueOnce(new Error("down"));
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePracticeDeckViewModel(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.error).toBe("Failed to load your practice cards"),
    );

    vi.mocked(fetchPracticeSuggestions).mockResolvedValue([]);
    vi.mocked(logPractice).mockRejectedValue(new Error("nope"));
    const second = createQueryWrapper();
    const { result: saving } = renderHook(() => usePracticeDeckViewModel(), {
      wrapper: second.wrapper,
    });
    await waitFor(() => expect(saving.current.state.isLoading).toBe(false));
    await act(() =>
      saving.current.actions.practice(learned[0], {
        practicedOn: "2026-11-20",
        confidence: "sure",
        note: "",
      }),
    );
    await waitFor(() =>
      expect(saving.current.state.saveError).toBe("Failed to save your practice"),
    );
  });
});

describe("useQuickLogViewModel", () => {
  it("logs the selected dances together and resets the form", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useQuickLogViewModel(), { wrapper });
    await waitFor(() => expect(result.current.state.hasLearnedDances).toBe(true));

    act(() => {
      result.current.actions.toggleDance(1);
      result.current.actions.toggleDance(2);
      result.current.actions.setDate("2026-11-20");
    });
    vi.mocked(logPractice).mockResolvedValue({ logged: 2, practiced_on: "2026-11-20" });
    await act(() => result.current.actions.submit());

    expect(logPractice).toHaveBeenCalledWith({
      choreography_ids: [1, 2],
      practiced_on: "2026-11-20",
      confidence: "sure",
    });
    expect(result.current.state.savedCount).toBe(2);
    expect(result.current.state.form.selected).toEqual([]);
  });

  it("does nothing without a selection and filters the dances by name", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useQuickLogViewModel(), { wrapper });
    await waitFor(() => expect(result.current.state.hasLearnedDances).toBe(true));

    await act(() => result.current.actions.submit());
    expect(logPractice).not.toHaveBeenCalled();

    act(() => result.current.actions.setQuery("alp"));
    expect(result.current.state.dances.map((dance) => dance.name)).toEqual(["Alpha"]);
  });

  it("keeps the selection and shows an error when saving fails", async () => {
    vi.mocked(logPractice).mockRejectedValue(new Error("nope"));
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useQuickLogViewModel(), { wrapper });
    await waitFor(() => expect(result.current.state.hasLearnedDances).toBe(true));

    act(() => result.current.actions.toggleDance(1));
    await act(() => result.current.actions.submit());

    await waitFor(() => expect(result.current.state.error).toBe("Failed to save your practice"));
    expect(result.current.state.form.selected).toEqual([1]);
  });
});

describe("usePracticeLogViewModel", () => {
  const entry = {
    id: 5,
    choreography_id: 1,
    choreography_name: "Alpha",
    practiced_on: "2026-11-20",
    confidence: "sure" as const,
    note: null,
    song_id: null,
    song_title: null,
  };

  it("groups the log by day and deletes an entry", async () => {
    vi.mocked(fetchPracticeLog).mockResolvedValue([entry]);
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePracticeLogViewModel(), { wrapper });
    await waitFor(() => expect(result.current.state.days).toHaveLength(1));

    await act(() => result.current.actions.removeEntry(5));
    expect(deletePracticeEntry).toHaveBeenCalledWith(5);
    await waitFor(() => expect(fetchPracticeLog).toHaveBeenCalledTimes(2));
  });

  it("reports a failed deletion", async () => {
    vi.mocked(fetchPracticeLog).mockResolvedValue([entry]);
    vi.mocked(deletePracticeEntry).mockRejectedValue(new Error("nope"));
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePracticeLogViewModel(), { wrapper });
    await waitFor(() => expect(result.current.state.days).toHaveLength(1));

    await act(() => result.current.actions.removeEntry(5));
    await waitFor(() =>
      expect(result.current.state.error).toBe("Failed to delete the practice entry"),
    );
  });
});
