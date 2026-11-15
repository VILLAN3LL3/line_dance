import type { Request, Response } from 'express';
import type { SavedFilterConfiguration as Configuration } from '../contracts/api.ts';
import * as filters from '../features/saved-filters/flow.ts';
import type { SaveRequest, UpdateRequest } from '../features/saved-filters/flow.ts';
import {
  prepareConfigurationSave,
  prepareConfigurationUpdate,
} from '../features/saved-filters/operations.ts';
import { prepareInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';

type FilterError =
  'invalid_id' | 'not_found' | 'name_required' | 'nothing_to_update' | 'duplicate_name';
type ErrorResponse = { error: string };
type SaveResponse =
  (Configuration & { message: 'Filter configuration saved successfully' }) | ErrorResponse;
type UpdateResponse =
  (Configuration & { message: 'Filter configuration updated successfully' }) | ErrorResponse;
type DeleteResponse = { message: 'Filter configuration deleted successfully' } | ErrorResponse;
type IdParameters = { params: { id: string } };

const filterErrors: Record<FilterError, [number, string]> = {
  invalid_id: [400, 'Invalid configuration id'],
  not_found: [404, 'Saved filter configuration not found'],
  name_required: [400, 'Configuration name is required'],
  nothing_to_update: [400, 'Nothing to update'],
  duplicate_name: [400, 'A configuration with that name already exists'],
};

function sendFilterError<T>(
  res: Response<T | ErrorResponse>,
  error: FilterError,
): Response<T | ErrorResponse> {
  const response = filterErrors[error];
  if (!response) throw new Error(`Unknown filter configuration error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareSaveFilter = prepareInput((req) => req.body, prepareConfigurationSave);
export const prepareUpdateFilter = prepareInput((req) => req.body, prepareConfigurationUpdate);

export async function getSavedFilterConfigurations(
  _req: Request,
  res: Response<Configuration[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await filters.getConfigurations());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to load configurations' });
  }
}

export async function saveFilterConfiguration(
  _req: Request,
  res: Response<SaveResponse, { input: SaveRequest }>,
): Promise<Response<SaveResponse> | void> {
  try {
    const result = await filters.saveConfiguration(res.locals.input);
    if ('error' in result) return sendFilterError(res, result.error);
    res.status(201).json({ ...result.value, message: 'Filter configuration saved successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
}

export async function updateSavedFilterConfiguration(
  req: IdParameters,
  res: Response<UpdateResponse, { input: UpdateRequest }>,
): Promise<Response<UpdateResponse> | void> {
  try {
    const result = await filters.updateConfiguration(req.params.id, res.locals.input);
    if ('error' in result) return sendFilterError(res, result.error);
    res.json({ ...result.value, message: 'Filter configuration updated successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
}

export async function deleteSavedFilterConfiguration(
  req: IdParameters,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await filters.deleteConfiguration(req.params.id);
    if ('error' in result) return sendFilterError(res, result.error);
    res.json({ message: 'Filter configuration deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
}
