import {
  validateBaseFigureGroupId,
  validateBaseFigureIds,
  validateGroupName,
  validateMaxLevel,
  validateMaxLevelGroupId,
} from './validation.js';
import * as groups from './repository.js';

const defaultBaseFigureNames = ['Hip Bump', 'Hip Sway', 'Kick', 'Run'];

export function getGroups() {
  return groups.listGroups();
}

export async function getGroup(id) {
  const group = await groups.findGroup(id);
  return group ? { value: group } : { error: 'group_not_found' };
}

export async function createGroup(input) {
  const validation = validateGroupName(input);
  if (validation.error) return validation;
  const figures = await groups.findFiguresByNames(defaultBaseFigureNames);
  return groups.withGroupTransaction(async () => {
    const result = await groups.insertGroup(validation.value);
    if (result.error) return result;
    await groups.insertBaseFigures(
      result.id,
      figures.map((figure) => figure.id),
    );
    return { value: await groups.findGroup(result.id) };
  });
}

export async function updateGroup(id, input) {
  const validation = validateGroupName(input);
  if (validation.error) return validation;
  return groups.withGroupTransaction(async () => {
    if (!(await groups.findGroup(id))) return { error: 'group_not_found' };
    const result = await groups.renameGroup(id, validation.value);
    if (result.error) return result;
    return { value: await groups.findGroup(id) };
  });
}

export async function getMaxLevel(groupId) {
  const id = validateMaxLevelGroupId(groupId);
  if (id.error) return id;
  const group = await groups.findGroup(id.value);
  if (!group) return { error: 'group_not_found' };
  return { value: { max_group_level_value: group.max_group_level_value ?? null } };
}

export async function updateMaxLevel(groupId, input) {
  const id = validateMaxLevelGroupId(groupId);
  if (id.error) return id;
  const level = validateMaxLevel(input);
  if (level.error) return level;
  return groups.withGroupTransaction(async () => {
    if (!(await groups.findGroup(id.value))) return { error: 'group_not_found' };
    await groups.setMaxLevel(id.value, level.value);
    const updated = await groups.findGroup(id.value);
    return { value: { max_group_level_value: updated.max_group_level_value ?? null } };
  });
}

export async function getBaseFigures(groupId) {
  const id = validateBaseFigureGroupId(groupId);
  if (id.error) return id;
  if (!(await groups.findGroup(id.value))) return { error: 'base_group_not_found' };
  const ids = await groups.findBaseFigureIds(id.value);
  return { value: await groups.findFigures(ids) };
}

export async function updateBaseFigures(groupId, input) {
  const id = validateBaseFigureGroupId(groupId);
  if (id.error) return id;
  if (!(await groups.findGroup(id.value))) return { error: 'base_group_not_found' };
  const validation = validateBaseFigureIds(input);
  if (validation.error) return validation;

  const result = await groups.withGroupTransaction(async () => {
    if (!(await groups.findGroup(id.value))) return { error: 'base_group_not_found' };
    await groups.deleteBaseFigures(id.value);
    await groups.insertBaseFigures(id.value, validation.value);
    return { value: await groups.findBaseFigureIds(id.value) };
  });
  if (result.error) return result;
  return { value: await groups.findFigures(result.value) };
}

export async function deleteGroup(id) {
  return (await groups.deleteGroup(id)) ? { value: true } : { error: 'group_not_found' };
}
