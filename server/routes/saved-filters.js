import * as filters from '../features/saved-filters/flow.js';
import { captureError } from '../utils/choreographyRouteErrors.js';

const filterErrors = {
  invalid_id: [400, 'Invalid configuration id'],
  not_found: [404, 'Saved filter configuration not found'],
  name_required: [400, 'Configuration name is required'],
  nothing_to_update: [400, 'Nothing to update'],
  duplicate_name: [400, 'A configuration with that name already exists'],
};

function sendFilterError(res, error) {
  const response = filterErrors[error];
  if (!response) throw new Error(`Unknown filter configuration error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getSavedFilterConfigurations(req, res) {
  try {
    res.json(await filters.getConfigurations());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to load configurations' });
  }
}

export async function saveFilterConfiguration(req, res) {
  try {
    const result = await filters.saveConfiguration(req.body);
    if (result.error) return sendFilterError(res, result.error);
    res.status(201).json({ ...result.value, message: 'Filter configuration saved successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
}

export async function updateSavedFilterConfiguration(req, res) {
  try {
    const result = await filters.updateConfiguration(req.params.id, req.body);
    if (result.error) return sendFilterError(res, result.error);
    res.json({ ...result.value, message: 'Filter configuration updated successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
}

export async function deleteSavedFilterConfiguration(req, res) {
  try {
    const result = await filters.deleteConfiguration(req.params.id);
    if (result.error) return sendFilterError(res, result.error);
    res.json({ message: 'Filter configuration deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
}
