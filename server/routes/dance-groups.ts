import type { Request, Response } from 'express';
import * as groups from '../features/groups/flow.ts';
import {
  prepareBaseFigureId,
  prepareBaseFiguresUpdate,
  prepareGroupId,
  prepareGroupUpdate,
  prepareMaxLevelId,
  prepareMaxLevelUpdate,
  validateGroupName,
} from '../features/groups/validation.ts';
import type {
  BaseFiguresUpdate,
  BaseIdResult,
  GroupId,
  GroupNameResult,
  GroupUpdate,
  MaxIdResult,
  MaxLevelUpdate,
} from '../features/groups/validation.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.ts';

type GroupError =
  | 'name_required'
  | 'duplicate_name'
  | 'group_not_found'
  | 'valid_group_id_required'
  | 'invalid_group_id'
  | 'invalid_max_level'
  | 'invalid_figure_ids'
  | 'base_group_not_found';
type ErrorResponse = { error: string };
type Group = Awaited<ReturnType<typeof groups.getGroups>>[number];
type Figure = Extract<
  Awaited<ReturnType<typeof groups.getBaseFigures>>,
  { value: object }
>['value'][number];
type MaxLevel = { max_group_level_value: number | null };
type GroupResponse = Group | undefined | ErrorResponse;
type DeleteResponse = { message: 'Dance group deleted successfully' } | ErrorResponse;
type InputResponse<T, R> = Response<R | ErrorResponse, { input: PreparedInput<T> }>;

const groupErrors: Record<GroupError, [number, string]> = {
  name_required: [400, 'Name is required'],
  duplicate_name: [400, 'A dance group with that name already exists'],
  group_not_found: [404, 'Dance group not found'],
  valid_group_id_required: [400, 'Valid group ID is required'],
  invalid_group_id: [400, 'Invalid group ID'],
  invalid_max_level: [400, 'max_group_level_value must be a non-negative integer or null'],
  invalid_figure_ids: [400, 'step_figure_ids must be an array of positive integers'],
  base_group_not_found: [404, 'Group not found'],
};

function sendGroupError<T>(
  res: Response<T | ErrorResponse>,
  error: GroupError,
): Response<T | ErrorResponse> {
  const response = groupErrors[error];
  if (!response) throw new Error(`Unknown group error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareGroupName = prepareInput((req) => req.body, validateGroupName);
export const prepareGroupIdentifier = prepareInput((req) => req.params, prepareGroupId);
export const prepareGroupChanges = prepareInput(
  (req) => ({ ...req.params, body: req.body }),
  prepareGroupUpdate,
);
export const prepareMaxIdentifier = prepareInput((req) => req.params, prepareMaxLevelId);
export const prepareMaxChanges = prepareInput(
  (req) => ({ ...req.params, body: req.body }),
  prepareMaxLevelUpdate,
);
export const prepareBaseIdentifier = prepareInput((req) => req.params, prepareBaseFigureId);
export const prepareBaseChanges = prepareInput(
  (req) => ({ ...req.params, body: req.body }),
  prepareBaseFiguresUpdate,
);

export async function getDanceGroups(
  _req: Request,
  res: Response<Group[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await groups.getGroups());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance groups' });
  }
}

export async function createDanceGroup(
  _req: Request,
  res: InputResponse<GroupNameResult, Group | undefined>,
): Promise<Response<GroupResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await groups.createGroup(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create dance group' });
  }
}

export async function getDanceGroupById(
  _req: Request,
  res: InputResponse<GroupId, Group>,
): Promise<Response<Group | ErrorResponse> | void> {
  try {
    if (typeof res.locals.input !== 'string') throw res.locals.input.exception;
    const result = await groups.getGroup(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance group' });
  }
}

export async function updateDanceGroup(
  _req: Request,
  res: InputResponse<GroupUpdate, Group | undefined>,
): Promise<Response<GroupResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await groups.updateGroup(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update dance group' });
  }
}

export async function getGroupMaxLevel(
  _req: Request,
  res: InputResponse<MaxIdResult, MaxLevel>,
): Promise<Response<MaxLevel | ErrorResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await groups.getMaxLevel(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch group max level' });
  }
}

export async function updateGroupMaxLevel(
  _req: Request,
  res: InputResponse<MaxLevelUpdate, MaxLevel>,
): Promise<Response<MaxLevel | ErrorResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await groups.updateMaxLevel(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update group max level' });
  }
}

export async function getGroupBaseStepFigures(
  _req: Request,
  res: InputResponse<BaseIdResult, Figure[]>,
): Promise<Response<Figure[] | ErrorResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await groups.getBaseFigures(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch base step figures' });
  }
}

export async function updateGroupBaseStepFigures(
  _req: Request,
  res: InputResponse<BaseFiguresUpdate, Figure[]>,
): Promise<Response<Figure[] | ErrorResponse> | void> {
  try {
    if ('exception' in res.locals.input) throw res.locals.input.exception;
    const result = await groups.updateBaseFigures(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update base step figures' });
  }
}

export async function deleteDanceGroup(
  _req: Request,
  res: Response<DeleteResponse, { input: PreparedInput<GroupId> }>,
): Promise<Response<DeleteResponse> | void> {
  try {
    if (typeof res.locals.input !== 'string') throw res.locals.input.exception;
    const result = await groups.deleteGroup(res.locals.input);
    if ('error' in result) return sendGroupError(res, result.error);
    res.json({ message: 'Dance group deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete dance group' });
  }
}
