import type { Request, Response } from 'express';
import * as trainers from '../features/trainers/flow.ts';
import { validateTrainer } from '../features/trainers/validation.ts';
import type { TrainerValidationResult } from '../features/trainers/validation.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.ts';

type TrainerError =
  'name_required' | 'phone_required' | 'email_required' | 'duplicate_email' | 'not_found';
type ErrorResponse = { error: string };
type Trainer = Awaited<ReturnType<typeof trainers.getTrainers>>[number];
type TrainerResponse = Trainer | undefined | ErrorResponse;
type DeleteResponse = { message: 'Trainer deleted successfully' } | ErrorResponse;

const trainerErrors: Record<TrainerError, [number, string]> = {
  name_required: [400, 'Name is required'],
  phone_required: [400, 'Phone is required'],
  email_required: [400, 'Email is required'],
  duplicate_email: [400, 'A trainer with that email already exists'],
  not_found: [404, 'Trainer not found'],
};

function sendTrainerError<T>(
  res: Response<T | ErrorResponse>,
  error: TrainerError,
): Response<T | ErrorResponse> {
  const response = trainerErrors[error];
  if (!response) throw new Error(`Unknown trainer error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareTrainer = prepareInput((req) => req.body, validateTrainer);

export async function getTrainers(
  _req: Request,
  res: Response<Trainer[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await trainers.getTrainers());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
}

export async function createTrainer(
  _req: Request,
  res: Response<TrainerResponse, { input: PreparedInput<TrainerValidationResult> }>,
): Promise<Response<TrainerResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    if ('error' in input) return sendTrainerError(res, input.error);
    const result = await trainers.createTrainer(input.value);
    if ('error' in result) return sendTrainerError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create trainer' });
  }
}

export async function updateTrainer(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<TrainerResponse, { input: PreparedInput<TrainerValidationResult> }>,
): Promise<Response<TrainerResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    if ('error' in input) return sendTrainerError(res, input.error);
    const result = await trainers.updateTrainer(req.params.id, input.value);
    if ('error' in result) return sendTrainerError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update trainer' });
  }
}

export async function deleteTrainer(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await trainers.deleteTrainer(req.params.id);
    if ('error' in result && result.error) return sendTrainerError(res, result.error);
    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete trainer' });
  }
}
