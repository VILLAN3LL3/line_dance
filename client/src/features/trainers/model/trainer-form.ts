import type { Trainer } from "../../../types";

export interface TrainerFormValues {
  name: string;
  phone: string;
  email: string;
}

export const emptyTrainerForm: TrainerFormValues = { name: "", phone: "", email: "" };

export function toTrainerFormValues(trainer: Trainer): TrainerFormValues {
  return { name: trainer.name, phone: trainer.phone, email: trainer.email };
}

export function hasAllTrainerFields(values: TrainerFormValues): boolean {
  return Boolean(values.name.trim() && values.phone.trim() && values.email.trim());
}

export const MISSING_TRAINER_FIELDS_MESSAGE = "Name, phone, and email are required";

export function getTrainerErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
