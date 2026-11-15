import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createDanceGroup, deleteDanceGroup, updateDanceGroup } from "../api";
import { GROUP_NAME_REQUIRED_MESSAGE, hasGroupName } from "../model/dance-group-name";
import { danceGroupKeys } from "../queryKeys";
import { useDanceGroupsQuery } from "./useDanceGroupQueries";

export type DanceGroupsAdminMode = "list" | "create";

const messageOr = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/** ViewModel for dance group administration: the group list (list mode) and the creation form. */
export const useDanceGroupsAdminViewModel = (mode: DanceGroupsAdminMode) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const groupsQuery = useDanceGroupsQuery(mode === "list");

  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: danceGroupKeys.all });
  const createMutation = useMutation({
    mutationFn: (name: string) => createDanceGroup(name),
    onSuccess: refresh,
  });
  const updateMutation = useMutation({
    mutationFn: (input: { id: number; name: string }) => updateDanceGroup(input.id, input.name),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDanceGroup(id),
    onSuccess: refresh,
  });

  useEffect(() => {
    if (groupsQuery.error) console.error(groupsQuery.error);
  }, [groupsQuery.error]);

  const isLoading =
    groupsQuery.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const error = actionError ?? (groupsQuery.isError ? "Failed to load dance groups" : null);

  const run = async (action: () => Promise<void>, failure: string, useServerMessage = true) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(useServerMessage ? messageOr(err, failure) : failure);
      console.error(err);
    }
  };

  const create = async () => {
    if (!hasGroupName(newGroupName)) {
      setActionError(GROUP_NAME_REQUIRED_MESSAGE);
      return;
    }
    await run(async () => {
      const group = await createMutation.mutateAsync(newGroupName);
      setNewGroupName("");
      await navigate(`/admin/groups/${group.id}`);
    }, "Failed to create dance group");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: number) => {
    if (!hasGroupName(editingName)) {
      setActionError(GROUP_NAME_REQUIRED_MESSAGE);
      return;
    }
    await run(async () => {
      await updateMutation.mutateAsync({ id, name: editingName });
      cancelEdit();
    }, "Failed to update dance group");
  };

  const remove = (id: number) =>
    run(
      () => deleteMutation.mutateAsync(id).then(() => undefined),
      "Failed to delete dance group",
      false,
    );

  return {
    state: {
      groups: groupsQuery.data ?? [],
      isLoading,
      error,
      newGroupName,
      editingId,
      editingName,
    },
    actions: {
      changeNewGroupName: setNewGroupName,
      create,
      startEdit: (id: number, name: string) => {
        setEditingId(id);
        setEditingName(name);
      },
      changeEditingName: setEditingName,
      cancelEdit,
      saveEdit,
      remove,
      openGroup: (id: number) => void navigate(`/admin/groups/${id}`),
      startCreating: () => {
        setNewGroupName("");
        void navigate("/admin/groups/new");
      },
      backToList: () => void navigate("/admin"),
    },
  };
};
