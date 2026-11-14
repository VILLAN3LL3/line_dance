import type { Request, Response } from 'express';
import * as choreographyWrites from '../features/choreographies/write-flow.ts';
import {
  preparePartialWriteRequest,
  prepareWriteRequest,
} from '../features/choreographies/validation.ts';
import type { ChoreographyIssue, WriteRequest } from '../features/choreographies/validation.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';

type ErrorResponse = { error: string; issues?: ChoreographyIssue[] };
type WriteResponse = { id: string | number; message: string } | ErrorResponse;
type DeleteResponse = { message: string } | ErrorResponse;
type Locals<T extends boolean> = { input: PreparedInput<WriteRequest<T>> };

function sendChoreographyValidationError<T>(
  res: Response<T | ErrorResponse>,
  issues: ChoreographyIssue[],
): Response<T | ErrorResponse> {
  let error = 'Choreography validation failed';
  if (
    issues.some(
      (issue) => (issue.field === 'name' || issue.field === 'level') && issue.key === 'required',
    )
  ) {
    error = 'Name and level are required';
  } else if (issues.some((issue) => issue.key === 'invalid_level')) {
    error = 'Invalid level. Must be one of the configured levels';
  } else if (issues.some((issue) => issue.key === 'invalid_information')) {
    error = 'Choreography information must be an array of category and description entries';
  }
  return res.status(400).json({ error, issues });
}

export const prepareWrite = prepareInput((req) => req.body, prepareWriteRequest);
export const preparePartialWrite = prepareInput((req) => req.body, preparePartialWriteRequest);

export async function validateChoreography(
  _req: Request,
  res: Response<{ valid: true } | ErrorResponse, Locals<false>>,
): Promise<Response<{ valid: true } | ErrorResponse>> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const issues = await choreographyWrites.validateChoreography(input);
    if (issues.length) return sendChoreographyValidationError(res, issues);
    return res.json({ valid: true });
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to validate choreography' });
  }
}

export async function createChoreography(
  _req: Request,
  res: Response<WriteResponse, Locals<false>>,
): Promise<Response<WriteResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await choreographyWrites.createChoreography(input);
    if ('error' in result && result.error === 'validation')
      return sendChoreographyValidationError(res, result.issues);
    if ('error' in result) throw new Error(`Unknown choreography error: ${result.error}`);
    res.status(201).json({ id: result.value, message: 'Choreography created successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create choreography' });
  }
}

export async function updateChoreography(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<WriteResponse, Locals<true>>,
): Promise<Response<WriteResponse> | void> {
  try {
    const result = await choreographyWrites.updateChoreography(req.params.id, res.locals.input);
    if ('error' in result && result.error === 'not_found')
      return res.status(404).json({ error: 'Choreography not found' });
    if ('error' in result && result.error === 'validation')
      return sendChoreographyValidationError(res, result.issues);
    res.json({ id: req.params.id, message: 'Choreography updated successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update choreography' });
  }
}

export async function deleteChoreography(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await choreographyWrites.deleteChoreography(req.params.id);
    if ('error' in result && result.error === 'not_found') {
      return res.status(404).json({ error: 'Choreography not found' });
    }
    if ('error' in result) throw new Error(`Unknown choreography error: ${result.error}`);
    res.json({ message: 'Choreography deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete choreography' });
  }
}
