import { captureError } from '../../utils/choreographyRouteErrors.js';
import { parseStoredFilters, validateConfigurationId } from './operations.ts';
import type { SavedFilters, SaveInput, UpdateInput } from './operations.ts';
import * as filters from './repository.ts';
import type { ConfigurationRow } from './repository.ts';

type InputException = { exception: TypeError | RangeError };
export type SaveRequest = SaveInput | InputException;
export type UpdateRequest = UpdateInput | InputException;
export interface Configuration {
  id: number;
  name: string;
  filters: SavedFilters;
  created_at: string;
  updated_at: string;
}
type SaveResult = { error: 'name_required' } | { value: Configuration };
type UpdateResult =
  | { error: 'invalid_id' | 'not_found' | 'name_required' | 'nothing_to_update' | 'duplicate_name' }
  | { value: Configuration };
type DeleteResult = { error: 'invalid_id' | 'not_found' } | { value: true };

function readStoredFilters(value: string): SavedFilters {
  try {
    return parseStoredFilters(value);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    captureError(error);
    return {};
  }
}

function toConfiguration(row: ConfigurationRow | undefined): Configuration {
  if (!row) throw new Error('Saved filter configuration was not found after writing');
  return {
    id: row.id,
    name: row.name,
    filters: readStoredFilters(row.filters_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getConfigurations(): Promise<Configuration[]> {
  await filters.ensureTable();
  return (await filters.listConfigurations()).map(toConfiguration);
}

export async function saveConfiguration(input: SaveRequest): Promise<SaveResult> {
  await filters.ensureTable();
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  const { name, filters: normalized } = input.value;
  return filters.withFilterTransaction(async () => {
    await filters.upsertConfiguration(name, JSON.stringify(normalized));
    return { value: toConfiguration(await filters.findConfigurationByName(name)) };
  });
}

export async function updateConfiguration(
  rawId: string,
  input: UpdateRequest,
): Promise<UpdateResult> {
  await filters.ensureTable();
  const id = validateConfigurationId(rawId);
  if ('error' in id) return id;
  return filters.withFilterTransaction(async () => {
    const existing = await filters.findConfiguration(id.value);
    if (!existing) return { error: 'not_found' };
    if ('exception' in input) throw input.exception;
    if ('error' in input) return input;
    const normalized = input.value.filters ?? readStoredFilters(existing.filters_json);
    const result = await filters.updateConfiguration(
      id.value,
      input.value.name ?? existing.name,
      JSON.stringify(normalized),
    );
    if (result.error) return result;
    return { value: toConfiguration(await filters.findConfiguration(id.value)) };
  });
}

export async function deleteConfiguration(rawId: string): Promise<DeleteResult> {
  await filters.ensureTable();
  const id = validateConfigurationId(rawId);
  if ('error' in id) return id;
  return (await filters.deleteConfiguration(id.value)) ? { value: true } : { error: 'not_found' };
}
