import { captureError } from '../../utils/choreographyRouteErrors.js';
import {
  normalizeSavedFilters,
  parseStoredFilters,
  validateConfigurationId,
  validateConfigurationName,
  validateConfigurationUpdate,
} from './operations.ts';
import * as filters from './repository.js';

function readStoredFilters(value) {
  try {
    return parseStoredFilters(value);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    captureError(error);
    return {};
  }
}

function toConfiguration(row) {
  return {
    id: row.id,
    name: row.name,
    filters: readStoredFilters(row.filters_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getConfigurations() {
  await filters.ensureTable();
  return (await filters.listConfigurations()).map(toConfiguration);
}

export async function saveConfiguration(input) {
  await filters.ensureTable();
  const name = validateConfigurationName(input?.name);
  if (name.error) return name;
  const normalized = normalizeSavedFilters(input?.filters || {});
  return filters.withFilterTransaction(async () => {
    await filters.upsertConfiguration(name.value, JSON.stringify(normalized));
    return { value: toConfiguration(await filters.findConfigurationByName(name.value)) };
  });
}

export async function updateConfiguration(rawId, input) {
  await filters.ensureTable();
  const id = validateConfigurationId(rawId);
  if (id.error) return id;
  return filters.withFilterTransaction(async () => {
    const existing = await filters.findConfiguration(id.value);
    if (!existing) return { error: 'not_found' };
    const validation = validateConfigurationUpdate(input, existing.name);
    if (validation.error) return validation;
    const normalized = validation.value.hasFilters
      ? normalizeSavedFilters(input?.filters || {})
      : readStoredFilters(existing.filters_json);
    const result = await filters.updateConfiguration(
      id.value,
      validation.value.name,
      JSON.stringify(normalized),
    );
    if (result.error) return result;
    return { value: toConfiguration(await filters.findConfiguration(id.value)) };
  });
}

export async function deleteConfiguration(rawId) {
  await filters.ensureTable();
  const id = validateConfigurationId(rawId);
  if (id.error) return id;
  return (await filters.deleteConfiguration(id.value)) ? { value: true } : { error: 'not_found' };
}
