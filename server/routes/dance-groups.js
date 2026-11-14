import * as groups from '../features/groups/flow.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const groupErrors = {
  name_required: [400, 'Name is required'],
  duplicate_name: [400, 'A dance group with that name already exists'],
  group_not_found: [404, 'Dance group not found'],
  valid_group_id_required: [400, 'Valid group ID is required'],
  invalid_group_id: [400, 'Invalid group ID'],
  invalid_max_level: [400, 'max_group_level_value must be a non-negative integer or null'],
  invalid_figure_ids: [400, 'step_figure_ids must be an array of positive integers'],
  base_group_not_found: [404, 'Group not found'],
};

function sendGroupError(res, error) {
  const response = groupErrors[error];
  if (!response) throw new Error(`Unknown group error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getDanceGroups(req, res) {
  try {
    res.json(await groups.getGroups());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance groups' });
  }
}

export async function createDanceGroup(req, res) {
  try {
    const result = await groups.createGroup(req.body);
    if (result.error) return sendGroupError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create dance group' });
  }
}

export async function getDanceGroupById(req, res) {
  try {
    const result = await groups.getGroup(req.params.id);
    if (result.error) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance group' });
  }
}

export async function updateDanceGroup(req, res) {
  try {
    const result = await groups.updateGroup(req.params.id, req.body);
    if (result.error) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update dance group' });
  }
}

export async function getGroupMaxLevel(req, res) {
  try {
    const result = await groups.getMaxLevel(req.params.groupId);
    if (result.error) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch group max level' });
  }
}

export async function updateGroupMaxLevel(req, res) {
  try {
    const result = await groups.updateMaxLevel(req.params.groupId, req.body);
    if (result.error) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update group max level' });
  }
}

export async function getGroupBaseStepFigures(req, res) {
  try {
    const result = await groups.getBaseFigures(req.params.groupId);
    if (result.error) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch base step figures' });
  }
}

export async function updateGroupBaseStepFigures(req, res) {
  try {
    const result = await groups.updateBaseFigures(req.params.groupId, req.body);
    if (result.error) return sendGroupError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update base step figures' });
  }
}

export async function deleteDanceGroup(req, res) {
  try {
    const result = await groups.deleteGroup(req.params.id);
    if (result.error) return sendGroupError(res, result.error);
    res.json({ message: 'Dance group deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete dance group' });
  }
}
