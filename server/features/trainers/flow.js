import { validateTrainer } from './validation.js';
import {
  clearCourseTrainer,
  deleteTrainer as deleteTrainerRecord,
  findTrainer,
  insertTrainer,
  listTrainers,
  saveTrainer,
  withTrainerTransaction,
} from './repository.js';

export function getTrainers() {
  return listTrainers();
}

export async function createTrainer(input) {
  const validation = validateTrainer(input);
  if (validation.error) return validation;

  return withTrainerTransaction(async () => {
    const result = await insertTrainer(validation.value);
    if (result.error) return result;
    return { value: await findTrainer(result.id) };
  });
}

export async function updateTrainer(id, input) {
  const validation = validateTrainer(input);
  if (validation.error) return validation;

  return withTrainerTransaction(async () => {
    if (!(await findTrainer(id))) return { error: 'not_found' };
    const result = await saveTrainer(id, validation.value);
    if (result.error) return result;
    return { value: await findTrainer(id) };
  });
}

export function deleteTrainer(id) {
  return withTrainerTransaction(async () => {
    await clearCourseTrainer(id);
    const deleted = await deleteTrainerRecord(id);
    return deleted ? { value: true } : { error: 'not_found' };
  });
}
