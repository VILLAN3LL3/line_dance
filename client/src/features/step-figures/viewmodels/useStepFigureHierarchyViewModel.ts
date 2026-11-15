import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  createStepFigureDefinition,
  deleteStepFigureDefinition,
  getStepFigureHierarchy,
  updateStepFigureDefinition,
} from "../api";
import {
  addComponentByName,
  buildFigureIndex,
  draftFromFigure,
  emptyDraft,
  findFigureIdByName,
  getComponentOptions,
  removeComponentByName,
  resolveSelectedFigure,
  sortCatalog,
  toComponentNames,
  type ComponentDraft,
} from "../model/step-figure-hierarchy";
import { stepFigureKeys } from "../queryKeys";

const NAME_REQUIRED_MESSAGE = "Step figure name is required";
const messageOr = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/** ViewModel for the step figure hierarchy admin: catalog, selection and create/edit/delete drafts. */
export const useStepFigureHierarchyViewModel = () => {
  const queryClient = useQueryClient();
  const hierarchyQuery = useQuery({
    queryKey: stepFigureKeys.hierarchy,
    queryFn: getStepFigureHierarchy,
  });
  const figures = hierarchyQuery.data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newDraft, setNewDraft] = useState<ComponentDraft>(emptyDraft);
  // The edit draft belongs to one figure; it is dropped whenever selection or server data changes.
  const [editState, setEditState] = useState<{ figureId: number; draft: ComponentDraft } | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedFigure = resolveSelectedFigure(figures, selectedId);
  const draftForSelection =
    editState?.figureId === selectedFigure?.id ? editState?.draft : undefined;
  const editDraft = draftForSelection ?? draftFromFigure(selectedFigure);

  const index = buildFigureIndex(figures);
  const catalog = sortCatalog(figures);

  const refresh = () => queryClient.invalidateQueries({ queryKey: stepFigureKeys.all });
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createStepFigureDefinition>[0]) =>
      createStepFigureDefinition(payload),
    onSuccess: refresh,
  });
  const updateMutation = useMutation({
    mutationFn: (input: { id: number; name: string; componentIds: number[] }) =>
      updateStepFigureDefinition(input.id, {
        name: input.name,
        component_ids: input.componentIds,
      }),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStepFigureDefinition(id),
    onSuccess: refresh,
  });

  useEffect(() => {
    if (hierarchyQuery.error) console.error(hierarchyQuery.error);
  }, [hierarchyQuery.error]);

  const isBusy =
    hierarchyQuery.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const loadError = hierarchyQuery.isError
    ? messageOr(hierarchyQuery.error, "Failed to load step figures")
    : null;

  const patchEditDraft = (patch: Partial<ComponentDraft>) => {
    if (!selectedFigure) return;
    setEditState({ figureId: selectedFigure.id, draft: { ...editDraft, ...patch } });
  };

  const run = async (action: () => Promise<void>, failure: string) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(messageOr(err, failure));
    }
  };

  const create = () =>
    run(async () => {
      if (!newDraft.name.trim()) {
        throw new Error(NAME_REQUIRED_MESSAGE);
      }
      const created = await createMutation.mutateAsync({
        name: newDraft.name.trim(),
        component_ids: newDraft.componentIds,
      });
      setNewDraft(emptyDraft);
      setEditState(null);
      setSelectedId(created.id);
    }, "Failed to create step figure");

  const update = () => {
    if (!selectedFigure) return Promise.resolve();
    return run(async () => {
      if (!editDraft.name.trim()) {
        throw new Error(NAME_REQUIRED_MESSAGE);
      }
      await updateMutation.mutateAsync({
        id: selectedFigure.id,
        name: editDraft.name.trim(),
        componentIds: editDraft.componentIds,
      });
      setEditState(null);
    }, "Failed to update step figure");
  };

  const remove = () => {
    if (!selectedFigure) return Promise.resolve();
    return run(async () => {
      await deleteMutation.mutateAsync(selectedFigure.id);
      setEditState(null);
      setSelectedId(null);
    }, "Failed to delete step figure");
  };

  const addNewComponent = () =>
    setNewDraft((draft) => ({
      ...draft,
      componentIds: addComponentByName(draft.componentIds, draft.componentInput, index),
      componentInput: "",
    }));

  const addEditComponent = () =>
    patchEditDraft({
      componentIds: addComponentByName(
        editDraft.componentIds,
        editDraft.componentInput,
        index,
        selectedFigure?.id,
      ),
      componentInput: "",
    });

  return {
    state: {
      figures,
      catalog,
      selectedFigure,
      isBusy,
      isInitialLoading: isBusy && figures.length === 0,
      error: actionError ?? loadError,
      newDraft,
      editDraft,
      newComponentOptions: getComponentOptions(catalog, newDraft.componentIds),
      editComponentOptions: selectedFigure
        ? getComponentOptions(catalog, editDraft.componentIds, selectedFigure.id)
        : [],
      newComponentNames: toComponentNames(newDraft.componentIds, index),
      editComponentNames: toComponentNames(editDraft.componentIds, index),
    },
    actions: {
      selectFigure: (id: number) => {
        setSelectedId(id);
        setEditState(null);
      },
      changeNewName: (name: string) => setNewDraft((draft) => ({ ...draft, name })),
      changeNewComponentInput: (componentInput: string) =>
        setNewDraft((draft) => ({ ...draft, componentInput })),
      addNewComponent,
      blurNewComponentInput: () => {
        if (findFigureIdByName(index, newDraft.componentInput) !== undefined) addNewComponent();
      },
      removeNewComponent: (name: string) =>
        setNewDraft((draft) => ({
          ...draft,
          componentIds: removeComponentByName(draft.componentIds, name, index),
        })),
      changeEditName: (name: string) => patchEditDraft({ name }),
      changeEditComponentInput: (componentInput: string) => patchEditDraft({ componentInput }),
      addEditComponent,
      blurEditComponentInput: () => {
        if (findFigureIdByName(index, editDraft.componentInput) !== undefined) addEditComponent();
      },
      removeEditComponent: (name: string) =>
        patchEditDraft({
          componentIds: removeComponentByName(editDraft.componentIds, name, index),
        }),
      create,
      update,
      remove,
    },
  };
};
