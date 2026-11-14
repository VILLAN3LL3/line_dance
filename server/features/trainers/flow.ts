import { validateTrainer } from './validation.ts';
import type { TrainerInput, TrainerValidationResult } from './validation.ts';
import {
  clearCourseTrainer,
  deleteTrainer as deleteTrainerRecord,
  findTrainer,
  insertTrainer,
  listTrainers,
  saveTrainer,
  withTrainerTransaction,
} from './repository.ts';
import type { DuplicateEmailError, Trainer } from './repository.ts';

type TrainerValidationError = Extract<TrainerValidationResult, { error: string }>;
type TrainerCreateResult =
  TrainerValidationError | DuplicateEmailError | { value: Trainer | undefined };
type TrainerUpdateResult = TrainerCreateResult | { error: 'not_found' };
type TrainerDeleteResult = { error: 'not_found' } | { value: true };

export async function getTrainers(): Promise<Trainer[]> {
  return listTrainers();
}

export async function createTrainer(input: TrainerInput): Promise<TrainerCreateResult> {
  const validation = validateTrainer(input);
  if ('error' in validation) return validation;

  return withTrainerTransaction(async () => {
    const result = await insertTrainer(validation.value);
    if ('error' in result) return result;
    return { value: await findTrainer(result.id) };
  });
}

export async function updateTrainer(
  id: number | string,
  input: TrainerInput,
): Promise<TrainerUpdateResult> {
  const validation = validateTrainer(input);
  if ('error' in validation) return validation;

  return withTrainerTransaction(async () => {
    if (!(await findTrainer(id))) return { error: 'not_found' };
    const result = await saveTrainer(id, validation.value);
    if (result.error) return result;
    return { value: await findTrainer(id) };
  });
}

export async function deleteTrainer(id: number | string): Promise<TrainerDeleteResult> {
  return withTrainerTransaction(async () => {
    await clearCourseTrainer(id);
    const deleted = await deleteTrainerRecord(id);
    return deleted ? { value: true } : { error: 'not_found' };
  });
}
