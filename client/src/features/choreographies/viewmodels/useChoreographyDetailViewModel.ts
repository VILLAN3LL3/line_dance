import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { browserHistory } from "../../../shared/browser/history";
import { getChoreographyUpdateErrorMessage } from "../../../shared/http/apiErrors";
import type { ChoreographyFormData } from "../../../types";
import { fetchChoreography, updateChoreography } from "../api";
import { choreographyKeys } from "../queryKeys";
import { useChoreographyCardViewModel } from "./useChoreographyCardViewModel";
import { useChoreographyFormViewModel } from "./useChoreographyFormViewModel";
import { useDeleteChoreographyMutation } from "./useChoreographyQueries";
import { useSaveWithDuplicateCheck } from "./useSaveWithDuplicateCheck";

type DetailMode = "view" | "edit";

/** ViewModel for a single choreography: read-only card, inline edit form and deletion. */
export const useChoreographyDetailViewModel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const choreographyId = Number(id);
  const hasValidId = Number.isFinite(choreographyId);
  const isEditQueryMode = new URLSearchParams(location.search).get("edit") === "1";
  const editModeFromNavigation = Boolean(
    (location.state as { editMode?: boolean } | null)?.editMode,
  );

  const [mode, setMode] = useState<DetailMode>(
    editModeFromNavigation || isEditQueryMode ? "edit" : "view",
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const choreographyQuery = useQuery({
    queryKey: choreographyKeys.detail(choreographyId),
    queryFn: () => fetchChoreography(choreographyId),
    enabled: hasValidId,
  });
  const deleteMutation = useDeleteChoreographyMutation();
  const cardViewModel = useChoreographyCardViewModel();

  const saveFlow = useSaveWithDuplicateCheck({
    save: async (data: ChoreographyFormData) => {
      await updateChoreography(choreographyId, data);
      await queryClient.invalidateQueries({ queryKey: choreographyKeys.all });
      setMode("view");
    },
    failureMessage: getChoreographyUpdateErrorMessage,
    excludeId: choreographyId,
  });
  const form = useChoreographyFormViewModel({
    initialData: choreographyQuery.data,
    initialDataKey: hasValidId ? choreographyId : undefined,
    onSubmit: saveFlow.actions.submit,
  });

  // Router state would re-open the editor on a browser reload, so consume it once.
  useEffect(() => {
    if (editModeFromNavigation) browserHistory.clearState();
  }, [editModeFromNavigation]);

  useEffect(() => {
    if (choreographyQuery.error) console.error(choreographyQuery.error);
  }, [choreographyQuery.error]);

  const removeChoreography = async () => {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(choreographyId);
      await navigate("/");
    } catch (err) {
      setDeleteError("Failed to delete choreography");
      console.error(err);
    }
  };

  const cancelEdit = () => {
    form.actions.reset(choreographyQuery.data);
    saveFlow.actions.cancelDuplicate();
    setMode("view");
  };

  const loadError = choreographyQuery.isError ? "Failed to load choreography" : null;

  return {
    state: {
      choreography: choreographyQuery.data ?? null,
      mode,
      hasValidId,
      isInitialLoading: choreographyQuery.isPending && hasValidId,
      isBusy: saveFlow.state.isSaving || deleteMutation.isPending,
      error: saveFlow.state.error ?? deleteError ?? loadError,
      duplicates: saveFlow.state.duplicates,
      showBackButton: !isEditQueryMode,
      cardViewModel,
      form,
    },
    actions: {
      startEdit: () => setMode("edit"),
      cancelEdit,
      back: () => void navigate(-1),
      removeChoreography,
      submit: saveFlow.actions.submit,
      confirmDuplicate: saveFlow.actions.confirmDuplicate,
      cancelDuplicate: saveFlow.actions.cancelDuplicate,
    },
  };
};
