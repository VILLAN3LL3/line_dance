import { validateChoreographyId } from '../ratings/validation.ts';
import type { PersonalLevelValidationResult } from './validation.ts';
import * as personalLevels from './repository.ts';

type SetResult =
  | { error: 'invalid_id' | 'not_found' | 'invalid_level' }
  | { value: { choreography_id: number; level: string } };
type RemoveResult = { error: 'invalid_id' } | { value: true };
export type PersonalLevelRequest =
  PersonalLevelValidationResult | { exception: TypeError | RangeError };

export async function setPersonalLevel(
  rawId: string,
  input: PersonalLevelRequest,
): Promise<SetResult> {
  const id = validateChoreographyId(rawId);
  if ('error' in id) return id;
  return personalLevels.withPersonalLevelTransaction(async () => {
    if (!(await personalLevels.findChoreography(id.value))) return { error: 'not_found' };
    if ('exception' in input) throw input.exception;
    if ('error' in input) return input;
    const level = await personalLevels.findLevel(input.value);
    if (!level) return { error: 'invalid_level' };
    await personalLevels.savePersonalLevel(id.value, level.id);
    return { value: { choreography_id: id.value, level: level.name } };
  });
}

export async function removePersonalLevel(rawId: string): Promise<RemoveResult> {
  const id = validateChoreographyId(rawId);
  if ('error' in id) return id;
  await personalLevels.deletePersonalLevel(id.value);
  return { value: true };
}
