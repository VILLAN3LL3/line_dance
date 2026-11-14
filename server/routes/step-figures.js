import * as figures from '../features/step-figures/flow.js';
import { captureError } from '../utils/choreographyRouteErrors.js';

const figureErrors = {
  invalid_id: [400, 'Invalid step figure id'],
  name_required: [400, 'Step figure name is required'],
  not_found: [404, 'Step figure not found'],
  duplicate: [400, 'This step figure already exists'],
  self_component: [400, 'A step figure cannot contain itself'],
  missing_component: [400, 'One or more component step figures do not exist'],
  cycle: [400, 'Step figure hierarchy cannot contain cycles'],
  used_by_choreography: [409, 'Step figure is assigned to choreographies and cannot be deleted'],
  used_as_component: [
    409,
    'Step figure is used as a component in another step figure and cannot be deleted',
  ],
};

function sendFigureError(res, error) {
  const response = figureErrors[error];
  if (!response) throw new Error(`Unknown step figure error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getStepFigures(req, res) {
  try {
    res.json(await figures.getFigureNames());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figures' });
  }
}

export async function getStepFiguresWithIds(req, res) {
  try {
    res.json(await figures.getFigures());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figures' });
  }
}

export async function getStepFigureHierarchy(req, res) {
  try {
    res.json(await figures.getHierarchy());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figure hierarchy' });
  }
}

export async function createStepFigure(req, res) {
  try {
    const result = await figures.createFigure(req.body);
    if (result.error) return sendFigureError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create step figure' });
  }
}

export async function updateStepFigure(req, res) {
  try {
    const result = await figures.updateFigure(req.params.id, req.body);
    if (result.error) return sendFigureError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update step figure' });
  }
}

export async function deleteStepFigure(req, res) {
  try {
    const result = await figures.deleteFigure(req.params.id);
    if (result.error) return sendFigureError(res, result.error);
    res.json({ message: 'Step figure deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete step figure' });
  }
}
