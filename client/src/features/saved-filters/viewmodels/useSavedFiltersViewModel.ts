import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { SearchFilters } from "../../../types";
import {
  deleteSavedFilterConfiguration,
  getSavedFilterConfigurations,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
} from "../api";
import { findConfigurationById, savedFilterMessages } from "../model/saved-filter-selection";
import { savedFilterKeys } from "../queryKeys";

interface UseSavedFiltersViewModelOptions {
  buildFilters: () => SearchFilters;
  applyLoadedFilters: (filters: SearchFilters) => Promise<void>;
  isLoading: boolean;
}

/** ViewModel for the saved filter configurations panel next to the choreography search. */
export const useSavedFiltersViewModel = ({
  buildFilters,
  applyLoadedFilters,
  isLoading,
}: UseSavedFiltersViewModelOptions) => {
  const queryClient = useQueryClient();
  const configurationsQuery = useQuery({
    queryKey: savedFilterKeys.all,
    queryFn: getSavedFilterConfigurations,
  });
  const configurations = configurationsQuery.data ?? [];

  const [selectedConfigurationId, setSelectedConfigurationId] = useState("");
  const [configurationName, setConfigurationName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (configurationsQuery.error) {
      console.error("Error loading saved filter configurations:", configurationsQuery.error);
    }
  }, [configurationsQuery.error]);
  const error =
    actionError ?? (configurationsQuery.isError ? savedFilterMessages.loadFailed : null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: savedFilterKeys.all });
  const saveMutation = useMutation({
    mutationFn: (name: string) => saveFilterConfiguration(name, buildFilters()),
    onSuccess: refresh,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof updateSavedFilterConfiguration>[1];
    }) => updateSavedFilterConfiguration(id, payload),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSavedFilterConfiguration(id),
    onSuccess: refresh,
  });

  const isSaving = saveMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isBusy = isLoading || isSaving || isUpdating || isDeleting;

  const fail = (text: string) => {
    setActionError(text);
    setMessage(null);
  };
  const reset = () => {
    setActionError(null);
    setMessage(null);
  };

  const selectConfiguration = (id: string) => {
    setSelectedConfigurationId(id);
    setConfigurationName(findConfigurationById(configurations, id)?.name ?? "");
  };

  const chooseConfiguration = (id: string) => {
    selectConfiguration(id);
    reset();
  };

  const requireSelected = () => {
    const selected = findConfigurationById(configurations, selectedConfigurationId);
    if (!selected) fail(savedFilterMessages.selectFirst);
    return selected;
  };

  const save = async () => {
    const name = configurationName.trim();
    if (!name) return fail(savedFilterMessages.nameRequired);

    reset();
    try {
      const saved = await saveMutation.mutateAsync(name);
      setSelectedConfigurationId(String(saved.id));
      setConfigurationName(saved.name);
      setMessage(savedFilterMessages.saved(saved.name));
    } catch (err) {
      console.error("Error saving filter configuration:", err);
      setActionError(savedFilterMessages.saveFailed);
    }
  };

  const load = async () => {
    if (!selectedConfigurationId) return fail(savedFilterMessages.selectToLoad);
    const selected = findConfigurationById(configurations, selectedConfigurationId);
    if (!selected) return fail(savedFilterMessages.selectedNotFound);

    setActionError(null);
    setMessage(savedFilterMessages.loaded(selected.name));
    await applyLoadedFilters(selected.filters || {});
  };

  const updateFilters = async () => {
    const selected = requireSelected();
    if (!selected) return;

    reset();
    try {
      const updated = await updateMutation.mutateAsync({
        id: selected.id,
        payload: { filters: buildFilters() },
      });
      setMessage(savedFilterMessages.updated(updated.name));
    } catch (err) {
      console.error("Error updating saved filter configuration:", err);
      setActionError(savedFilterMessages.updateFailed);
    }
  };

  const rename = async () => {
    const selected = requireSelected();
    if (!selected) return;
    const newName = configurationName.trim();
    if (!newName) return fail(savedFilterMessages.newNameRequired);

    reset();
    try {
      const updated = await updateMutation.mutateAsync({
        id: selected.id,
        payload: { name: newName },
      });
      setConfigurationName(updated.name);
      setMessage(savedFilterMessages.renamed(updated.name));
    } catch (err) {
      console.error("Error renaming saved filter configuration:", err);
      setActionError(savedFilterMessages.renameFailed);
    }
  };

  const remove = async () => {
    const selected = requireSelected();
    if (!selected) return;

    reset();
    try {
      await deleteMutation.mutateAsync(selected.id);
      selectConfiguration("");
      setMessage(savedFilterMessages.deleted(selected.name));
    } catch (err) {
      console.error("Error deleting saved filter configuration:", err);
      setActionError(savedFilterMessages.deleteFailed);
    }
  };

  return {
    state: {
      configurations,
      selectedConfigurationId,
      selectedConfiguration: findConfigurationById(configurations, selectedConfigurationId),
      configurationName,
      isSaving,
      isUpdating,
      isDeleting,
      isLoadingConfigurations: configurationsQuery.isPending,
      message,
      error,
      isBusy,
    },
    actions: {
      changeName: setConfigurationName,
      chooseConfiguration,
      save,
      load,
      updateFilters,
      rename,
      remove,
    },
  };
};

export type SavedFiltersViewModel = ReturnType<typeof useSavedFiltersViewModel>;
