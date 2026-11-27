import type {
  BaseFiguresUpdate,
  BaseIdResult,
  GroupId,
  GroupNameResult,
  GroupUpdate,
  MaxIdResult,
  MaxLevelUpdate,
} from './validation.ts';
import * as groups from './repository.ts';
import type { Group } from './repository.ts';
import type { Figure } from '../step-figures/operations.ts';

const defaultBaseFigureNames = ['Hip Sway/Hip Bump', 'Kick', 'Run'];
type GroupResult =
  { error: 'name_required' | 'duplicate_name' | 'group_not_found' } | { value: Group | undefined };
type MaxLevel = { max_group_level_value: number | null };
type MaxResult =
  | { error: 'valid_group_id_required' | 'invalid_max_level' | 'group_not_found' }
  | { value: MaxLevel };
type BaseResult =
  | { error: 'invalid_group_id' | 'invalid_figure_ids' | 'base_group_not_found' }
  | { value: Figure[] };

export async function getGroups(): Promise<Group[]> {
  return groups.listGroups();
}

export async function getGroup(
  id: GroupId,
): Promise<{ value: Group } | { error: 'group_not_found' }> {
  const group = await groups.findGroup(id);
  return group ? { value: group } : { error: 'group_not_found' };
}

export async function createGroup(validation: GroupNameResult): Promise<GroupResult> {
  if ('error' in validation) return validation;
  const figures = await groups.findFiguresByNames(defaultBaseFigureNames);
  return groups.withGroupTransaction(async () => {
    const result = await groups.insertGroup(validation.value);
    if ('error' in result) return result;
    await groups.insertBaseFigures(
      result.id,
      figures.map((figure) => figure.id),
    );
    return { value: await groups.findGroup(result.id) };
  });
}

export async function updateGroup({ id, name: validation }: GroupUpdate): Promise<GroupResult> {
  if ('error' in validation) return validation;
  return groups.withGroupTransaction(async () => {
    if (!(await groups.findGroup(id))) return { error: 'group_not_found' };
    const result = await groups.renameGroup(id, validation.value);
    if ('error' in result) return result;
    return { value: await groups.findGroup(id) };
  });
}

export async function getMaxLevel(id: MaxIdResult): Promise<MaxResult> {
  if ('error' in id) return id;
  const group = await groups.findGroup(id.value);
  if (!group) return { error: 'group_not_found' };
  return { value: { max_group_level_value: group.max_group_level_value ?? null } };
}

export async function updateMaxLevel(input: MaxLevelUpdate): Promise<MaxResult> {
  if ('error' in input) return input;
  const { id, level } = input.value;
  return groups.withGroupTransaction(async () => {
    if (!(await groups.findGroup(id))) return { error: 'group_not_found' };
    await groups.setMaxLevel(id, level);
    const updated = await groups.findGroup(id);
    if (!updated) throw new Error('Group disappeared during max level update');
    return { value: { max_group_level_value: updated.max_group_level_value ?? null } };
  });
}

export async function getBaseFigures(id: BaseIdResult): Promise<BaseResult> {
  if ('error' in id) return id;
  if (!(await groups.findGroup(id.value))) return { error: 'base_group_not_found' };
  const ids = await groups.findBaseFigureIds(id.value);
  return { value: await groups.findFigures(ids) };
}

export async function updateBaseFigures(input: BaseFiguresUpdate): Promise<BaseResult> {
  if ('error' in input) return input;
  const { id, figures: validation } = input.value;
  if (!(await groups.findGroup(id))) return { error: 'base_group_not_found' };
  if ('exception' in validation) throw validation.exception;
  if ('error' in validation) return validation;

  const result = await groups.withGroupTransaction<
    { error: 'base_group_not_found' } | { value: number[] }
  >(async () => {
    if (!(await groups.findGroup(id))) return { error: 'base_group_not_found' };
    await groups.deleteBaseFigures(id);
    await groups.insertBaseFigures(id, validation.value);
    return { value: await groups.findBaseFigureIds(id) };
  });
  if ('error' in result) return result;
  return { value: await groups.findFigures(result.value) };
}

export async function deleteGroup(
  id: GroupId,
): Promise<{ value: true } | { error: 'group_not_found' }> {
  return (await groups.deleteGroup(id)) ? { value: true } : { error: 'group_not_found' };
}
