import { z } from 'zod';

const groupName = z.string().trim().min(1).brand<'GroupName'>();
const groupId = z.string().brand<'GroupId'>();
const idParams = z.object({ id: groupId });
const groupParams = z.object({ groupId: z.string() });
const bodyWithId = z.object({ id: groupId, body: z.unknown().optional() });
const bodyWithGroupId = z.object({ groupId: z.string(), body: z.unknown().optional() });
const maxLevelBody = z.object({ max_group_level_value: z.unknown().optional() });
const figureIds = z.array(z.number().refine((id) => Number.isInteger(id) && id > 0));
const figureBody = z.object({ step_figure_ids: figureIds });
const stringConversion = z.preprocess(String, z.string());

export type GroupId = z.output<typeof groupId>;
export type GroupName = z.output<typeof groupName>;
export type GroupNameResult = { error: 'name_required' } | { value: GroupName };
export type MaxIdResult = { error: 'valid_group_id_required' } | { value: number };
export type BaseIdResult = { error: 'invalid_group_id' } | { value: number };
export type MaxLevelResult = { error: 'invalid_max_level' } | { value: number | null };
export type BaseFiguresResult = { error: 'invalid_figure_ids' } | { value: number[] };
export type GroupUpdate = { id: GroupId; name: GroupNameResult };
export type MaxLevelUpdate =
  | { error: 'valid_group_id_required' | 'invalid_max_level' }
  | { value: { id: number; level: number | null } };
export type BaseFiguresUpdate =
  | { error: 'invalid_group_id' }
  | {
      value: {
        id: number;
        figures: BaseFiguresResult | { exception: TypeError | RangeError };
      };
    };

export function prepareGroupId(input: unknown): GroupId {
  return idParams.parse(input).id;
}

export function validateGroupName(input: unknown): GroupNameResult {
  if (input === null || input === undefined) throw new TypeError('Group input is missing');
  const parsed = z.object({ name: groupName }).safeParse(input);
  return parsed.success ? { value: parsed.data.name } : { error: 'name_required' };
}

export function prepareGroupUpdate(input: unknown): GroupUpdate {
  const { id, body } = bodyWithId.parse(input);
  return { id, name: validateGroupName(body) };
}

export function validateMaxLevelGroupId(groupId: string): MaxIdResult {
  const parsed = Number.parseInt(groupId, 10);
  if (!groupId || !Number.isFinite(parsed)) return { error: 'valid_group_id_required' };
  return { value: parsed };
}

export function validateBaseFigureGroupId(groupId: string): BaseIdResult {
  const parsed = Number.parseInt(groupId, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return { error: 'invalid_group_id' };
  return { value: parsed };
}

export function validateMaxLevel(input: unknown): MaxLevelResult {
  const body = maxLevelBody.safeParse(input);
  const value = body.success ? body.data.max_group_level_value : undefined;
  if (value === null || value === undefined || value === '') return { value: null };
  const parsed = Number.parseInt(stringConversion.parse(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return { error: 'invalid_max_level' };
  return { value: parsed };
}

export function validateBaseFigureIds(input: unknown): BaseFiguresResult {
  if (input === null || input === undefined) throw new TypeError('Base figures input is missing');
  const parsed = figureBody.safeParse(input);
  return parsed.success ? { value: parsed.data.step_figure_ids } : { error: 'invalid_figure_ids' };
}

export function prepareMaxLevelId(input: unknown): MaxIdResult {
  return validateMaxLevelGroupId(groupParams.parse(input).groupId);
}

export function prepareBaseFigureId(input: unknown): BaseIdResult {
  return validateBaseFigureGroupId(groupParams.parse(input).groupId);
}

export function prepareMaxLevelUpdate(input: unknown): MaxLevelUpdate {
  const { groupId: rawId, body } = bodyWithGroupId.parse(input);
  const id = validateMaxLevelGroupId(rawId);
  if ('error' in id) return id;
  const level = validateMaxLevel(body);
  if ('error' in level) return level;
  return { value: { id: id.value, level: level.value } };
}

export function prepareBaseFiguresUpdate(input: unknown): BaseFiguresUpdate {
  const { groupId: rawId, body } = bodyWithGroupId.parse(input);
  const id = validateBaseFigureGroupId(rawId);
  if ('error' in id) return id;
  try {
    return { value: { id: id.value, figures: validateBaseFigureIds(body) } };
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error;
    return { value: { id: id.value, figures: { exception: error } } };
  }
}
