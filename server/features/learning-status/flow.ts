import { validateChoreographyId } from '../ratings/validation.ts';
import type { LearningStatusValidationResult } from './validation.ts';
import * as learningStatus from './repository.ts';
import * as practice from '../practice/repository.ts';
import type { StoredLearningStatus } from './repository.ts';

export type LearningStatusRequest =
  LearningStatusValidationResult | { exception: TypeError | RangeError };
type SetResult =
  | { error: 'invalid_id' | 'not_found' | 'invalid_status' }
  | { value: { choreography_id: number } & StoredLearningStatus };
type RemoveResult = { error: 'invalid_id' } | { value: true };

/**
 * Saves the status. Marking a dance as learned records today as its first practice, so it enters
 * the practice box with the first interval; changing between statuses never adds one twice.
 */
export async function storeLearningStatus(
  id: number | string,
  status: StoredLearningStatus['status'],
): Promise<void> {
  const previous = await learningStatus.findStatus(id);
  await learningStatus.saveStatus(id, status);
  if (status === 'learned' && previous?.status !== 'learned') {
    await practice.insertFirstPracticeIfNone(id);
  }
}

export async function setLearningStatus(
  rawId: string,
  input: LearningStatusRequest,
): Promise<SetResult> {
  const id = validateChoreographyId(rawId);
  if ('error' in id) return id;
  return learningStatus.withLearningStatusTransaction(async () => {
    if (!(await learningStatus.findChoreography(id.value))) return { error: 'not_found' };
    if ('exception' in input) throw input.exception;
    if ('error' in input) return input;
    await storeLearningStatus(id.value, input.value);
    const stored = await learningStatus.findStatus(id.value);
    if (!stored) throw new Error('Learning status disappeared during write');
    return { value: { choreography_id: id.value, ...stored } };
  });
}

export async function removeLearningStatus(rawId: string): Promise<RemoveResult> {
  const id = validateChoreographyId(rawId);
  if ('error' in id) return id;
  await learningStatus.deleteStatus(id.value);
  return { value: true };
}
