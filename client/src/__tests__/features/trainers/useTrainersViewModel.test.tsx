import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import {
  createTrainer,
  deleteTrainer,
  getTrainers,
  updateTrainer,
} from "../../../features/trainers/api";
import { useTrainersViewModel } from "../../../features/trainers/viewmodels/useTrainersViewModel";
import { createQueryWrapper } from "../../helpers/renderWithQueryClient";

vi.mock("../../../features/trainers/api", () => ({
  getTrainers: vi.fn(),
  createTrainer: vi.fn(),
  updateTrainer: vi.fn(),
  deleteTrainer: vi.fn(),
}));

const trainer = {
  id: 1,
  name: "Ann",
  phone: "123",
  email: "ann@example.com",
  created_at: "2024-01-01",
};

function renderViewModel() {
  const { wrapper } = createQueryWrapper();
  return renderHook(() => useTrainersViewModel(), { wrapper });
}

describe("useTrainersViewModel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getTrainers).mockResolvedValue([trainer]);
  });

  it("loads trainers", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.trainers).toEqual([trainer]));
    expect(result.current.state.error).toBeNull();
  });

  it("reports a load failure", async () => {
    vi.mocked(getTrainers).mockRejectedValue(new Error("down"));
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.error).toBe("Failed to load trainers"));
  });

  it("rejects incomplete new trainers without calling the API", async () => {
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.trainers).toHaveLength(1));
    await act(() => result.current.actions.submitNewTrainer());
    expect(result.current.state.error).toBe("Name, phone, and email are required");
    expect(createTrainer).not.toHaveBeenCalled();
  });

  it("creates a trainer, resets the form and reloads the list", async () => {
    vi.mocked(createTrainer).mockResolvedValue(trainer);
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.trainers).toHaveLength(1));
    act(() =>
      result.current.actions.changeNewTrainer({ name: "Bob", phone: "9", email: "b@example.com" }),
    );
    await act(() => result.current.actions.submitNewTrainer());
    expect(createTrainer).toHaveBeenCalledWith("Bob", "9", "b@example.com");
    expect(result.current.state.newTrainer.name).toBe("");
    expect(getTrainers).toHaveBeenCalledTimes(2);
  });

  it("keeps the form and shows the server message when creation fails", async () => {
    vi.mocked(createTrainer).mockRejectedValue(new Error("Email taken"));
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.trainers).toHaveLength(1));
    act(() =>
      result.current.actions.changeNewTrainer({ name: "Bob", phone: "9", email: "b@example.com" }),
    );
    await act(() => result.current.actions.submitNewTrainer());
    expect(result.current.state.error).toBe("Email taken");
    expect(result.current.state.newTrainer.name).toBe("Bob");
  });

  it("edits and saves a trainer", async () => {
    vi.mocked(updateTrainer).mockResolvedValue(trainer);
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.trainers).toHaveLength(1));
    act(() => result.current.actions.startEdit(trainer));
    act(() => result.current.actions.changeEditTrainer({ name: "Anne" }));
    await act(() => result.current.actions.saveEdit(1));
    expect(updateTrainer).toHaveBeenCalledWith(1, "Anne", "123", "ann@example.com");
    expect(result.current.state.editingId).toBeNull();
  });

  it("deletes a trainer", async () => {
    vi.mocked(deleteTrainer).mockResolvedValue({ message: "ok" });
    const { result } = renderViewModel();
    await waitFor(() => expect(result.current.state.trainers).toHaveLength(1));
    await act(() => result.current.actions.removeTrainer(1));
    expect(deleteTrainer).toHaveBeenCalledWith(1);
  });
});
