import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Trainer } from "../../../types";
import { createTrainer, deleteTrainer, updateTrainer } from "../api";
import {
  emptyTrainerForm,
  getTrainerErrorMessage,
  hasAllTrainerFields,
  MISSING_TRAINER_FIELDS_MESSAGE,
  toTrainerFormValues,
  type TrainerFormValues,
} from "../model/trainer-form";
import { trainerKeys } from "../queryKeys";
import { useTrainersQuery } from "./useTrainersQuery";

/** ViewModel for the trainer administration page: owns form state and orchestrates the API calls. */
export function useTrainersViewModel() {
  const queryClient = useQueryClient();
  const trainersQuery = useTrainersQuery();

  const [newTrainer, setNewTrainer] = useState<TrainerFormValues>(emptyTrainerForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTrainer, setEditTrainer] = useState<TrainerFormValues>(emptyTrainerForm);
  const [actionError, setActionError] = useState<string | null>(null);

  // Awaiting the invalidation keeps the page busy until the refreshed list has arrived.
  const refreshTrainers = () => queryClient.invalidateQueries({ queryKey: trainerKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: TrainerFormValues) =>
      createTrainer(values.name, values.phone, values.email),
    onSuccess: refreshTrainers,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: TrainerFormValues }) =>
      updateTrainer(id, values.name, values.phone, values.email),
    onSuccess: refreshTrainers,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTrainer(id),
    onSuccess: refreshTrainers,
  });

  const isBusy =
    trainersQuery.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    if (trainersQuery.error) console.error(trainersQuery.error);
  }, [trainersQuery.error]);
  const error = actionError ?? (trainersQuery.isError ? "Failed to load trainers" : null);

  const runAction = async (action: () => Promise<unknown>, failureMessage: string) => {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setActionError(getTrainerErrorMessage(err, failureMessage));
      console.error(err);
      return false;
    }
  };

  const submitNewTrainer = async () => {
    if (!hasAllTrainerFields(newTrainer)) {
      setActionError(MISSING_TRAINER_FIELDS_MESSAGE);
      return;
    }
    const created = await runAction(
      () => createMutation.mutateAsync(newTrainer),
      "Failed to create trainer",
    );
    if (created) setNewTrainer(emptyTrainerForm);
  };

  const startEdit = (trainer: Trainer) => {
    setEditingId(trainer.id);
    setEditTrainer(toTrainerFormValues(trainer));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTrainer(emptyTrainerForm);
  };

  const saveEdit = async (id: number) => {
    if (!hasAllTrainerFields(editTrainer)) {
      setActionError(MISSING_TRAINER_FIELDS_MESSAGE);
      return;
    }
    const updated = await runAction(
      () => updateMutation.mutateAsync({ id, values: editTrainer }),
      "Failed to update trainer",
    );
    if (updated) cancelEdit();
  };

  const removeTrainer = async (id: number) => {
    await runAction(() => deleteMutation.mutateAsync(id), "Failed to delete trainer");
  };

  return {
    state: {
      trainers: trainersQuery.data ?? [],
      isBusy,
      error,
      newTrainer,
      editingId,
      editTrainer,
    },
    actions: {
      changeNewTrainer: (patch: Partial<TrainerFormValues>) =>
        setNewTrainer((current) => ({ ...current, ...patch })),
      changeEditTrainer: (patch: Partial<TrainerFormValues>) =>
        setEditTrainer((current) => ({ ...current, ...patch })),
      submitNewTrainer,
      startEdit,
      cancelEdit,
      saveEdit,
      removeTrainer,
    },
  };
}

export type TrainersViewModel = ReturnType<typeof useTrainersViewModel>;
