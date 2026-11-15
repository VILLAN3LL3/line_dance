import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@testing-library/react";

import { checkChoreographyDuplicates } from "../../../features/choreographies/api";
import { useSaveWithDuplicateCheck } from "../../../features/choreographies/viewmodels/useSaveWithDuplicateCheck";

import type { ChoreographyFormData } from "../../../types";

vi.mock("../../../features/choreographies/api", () => ({
  checkChoreographyDuplicates: vi.fn(),
}));

const data = { name: "Waltz", level: "Beginner", authors: ["Alice"] } as ChoreographyFormData;
const duplicate = { id: 7, name: "Waltz", level: "Beginner", authors: ["Alice"] };
const fieldIssueError = {
  isAxiosError: true,
  response: { status: 400, data: { issues: [{ field: "name", key: "required" }] } },
};

function setup(save: (data: ChoreographyFormData) => Promise<void>) {
  return renderHook(() =>
    useSaveWithDuplicateCheck({ save, failureMessage: () => "Failed to save", excludeId: 3 }),
  );
}

describe("useSaveWithDuplicateCheck", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([]);
  });

  it("saves directly when no duplicates exist", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(save);

    await act(() => result.current.actions.submit(data));
    expect(checkChoreographyDuplicates).toHaveBeenCalledWith("Waltz", "Beginner", ["Alice"], 3);
    expect(save).toHaveBeenCalledWith(data);
    expect(result.current.state).toMatchObject({ isSaving: false, error: null, duplicates: [] });
  });

  it("asks for confirmation when duplicates exist and saves after confirming", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(save);

    await act(() => result.current.actions.submit(data));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.state.duplicates).toEqual([duplicate]);

    await act(() => result.current.actions.confirmDuplicate());
    expect(save).toHaveBeenCalledWith(data);
    expect(result.current.state.duplicates).toEqual([]);
  });

  it("drops the pending save when the warning is cancelled", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(save);

    await act(() => result.current.actions.submit(data));
    act(() => result.current.actions.cancelDuplicate());
    await act(() => result.current.actions.confirmDuplicate());
    expect(save).not.toHaveBeenCalled();
    expect(result.current.state.duplicates).toEqual([]);
  });

  it("reports save failures", async () => {
    const save = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = setup(save);

    await act(() => result.current.actions.submit(data));
    expect(result.current.state.error).toBe("Failed to save");
  });

  it("rethrows field issues so the form can display them", async () => {
    const save = vi.fn().mockRejectedValue(fieldIssueError);
    const { result } = setup(save);

    await expect(act(() => result.current.actions.submit(data))).rejects.toBe(fieldIssueError);
    expect(result.current.state.error).toBeNull();
  });

  it("asks to re-save when confirming a duplicate hits field issues", async () => {
    vi.mocked(checkChoreographyDuplicates).mockResolvedValue([duplicate]);
    const save = vi.fn().mockRejectedValue(fieldIssueError);
    const { result } = setup(save);

    await act(() => result.current.actions.submit(data));
    await act(() => result.current.actions.confirmDuplicate());
    expect(result.current.state.error).toBe(
      "Validation failed. Save the form again to review the field errors.",
    );
  });
});
