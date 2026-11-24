import type { Trainer } from "../../../types";

export type TrainerGenderValue = NonNullable<Trainer["gender"]> | "";

export interface TrainerFormValues {
  name: string;
  phone: string;
  email: string;
  gender: TrainerGenderValue;
}

/** The gender only selects the salutation ("Deine"/"Dein") in the participant PDF. */
export const trainerGenderOptions: { value: TrainerGenderValue; label: string }[] = [
  { value: "", label: "Gender (optional)" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "diverse", label: "Diverse" },
];

export const genderLabel = (gender: NonNullable<Trainer["gender"]>): string =>
  trainerGenderOptions.find((option) => option.value === gender)?.label ?? gender;

export const emptyTrainerForm: TrainerFormValues = { name: "", phone: "", email: "", gender: "" };

export function toTrainerFormValues(trainer: Trainer): TrainerFormValues {
  return {
    name: trainer.name,
    phone: trainer.phone,
    email: trainer.email,
    gender: trainer.gender ?? "",
  };
}

export const toGenderPayload = (gender: TrainerGenderValue): Trainer["gender"] =>
  gender === "" ? null : gender;

export function hasAllTrainerFields(values: TrainerFormValues): boolean {
  return Boolean(values.name.trim() && values.phone.trim() && values.email.trim());
}

export const MISSING_TRAINER_FIELDS_MESSAGE = "Name, phone, and email are required";

export function getTrainerErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
