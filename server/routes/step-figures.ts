import type { Request, Response } from 'express';
import * as figures from '../features/step-figures/flow.ts';
import type { FigureRequest } from '../features/step-figures/flow.ts';
import { validateFigure } from '../features/step-figures/operations.ts';
import { prepareInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.js';

type FigureError =
  | 'invalid_id'
  | 'name_required'
  | 'not_found'
  | 'duplicate'
  | 'self_component'
  | 'missing_component'
  | 'cycle'
  | 'used_by_choreography'
  | 'used_as_component';
type ErrorResponse = { error: string };
type Figure = Awaited<ReturnType<typeof figures.getFigures>>[number];
type HierarchyFigure = Awaited<ReturnType<typeof figures.getHierarchy>>[number];
type FigureResponse = HierarchyFigure | null | ErrorResponse;
type DeleteResponse = { message: 'Step figure deleted successfully' } | ErrorResponse;

const figureErrors: Record<FigureError, [number, string]> = {
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

function sendFigureError<T>(
  res: Response<T | ErrorResponse>,
  error: FigureError,
): Response<T | ErrorResponse> {
  const response = figureErrors[error];
  if (!response) throw new Error(`Unknown step figure error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareFigure = prepareInput((req) => req.body, validateFigure);

export async function getStepFigures(
  _req: Request,
  res: Response<string[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await figures.getFigureNames());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figures' });
  }
}

export async function getStepFiguresWithIds(
  _req: Request,
  res: Response<Figure[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await figures.getFigures());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figures' });
  }
}

export async function getStepFigureHierarchy(
  _req: Request,
  res: Response<HierarchyFigure[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await figures.getHierarchy());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figure hierarchy' });
  }
}

export async function createStepFigure(
  _req: Request,
  res: Response<FigureResponse, { input: FigureRequest }>,
): Promise<Response<FigureResponse> | void> {
  try {
    const result = await figures.createFigure(res.locals.input);
    if ('error' in result) return sendFigureError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create step figure' });
  }
}

export async function updateStepFigure(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<FigureResponse, { input: FigureRequest }>,
): Promise<Response<FigureResponse> | void> {
  try {
    const result = await figures.updateFigure(req.params.id, res.locals.input);
    if ('error' in result) return sendFigureError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update step figure' });
  }
}

export async function deleteStepFigure(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await figures.deleteFigure(req.params.id);
    if ('error' in result) return sendFigureError(res, result.error);
    res.json({ message: 'Step figure deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete step figure' });
  }
}
