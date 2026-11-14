import * as choreographyReads from '../features/choreographies/read-flow.js';
import * as choreographyWrites from '../features/choreographies/write-flow.js';
import { captureError } from '../utils/choreographyRouteErrors.js';

function sendChoreographyValidationError(res, issues) {
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

export async function validateChoreography(req, res) {
  try {
    const issues = await choreographyWrites.validateChoreography(req.body);
    if (issues.length) return sendChoreographyValidationError(res, issues);
    return res.json({ valid: true });
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to validate choreography' });
  }
}

export async function createChoreography(req, res) {
  try {
    const result = await choreographyWrites.createChoreography(req.body);
    if (result.error === 'validation') return sendChoreographyValidationError(res, result.issues);
    if (result.error) throw new Error(`Unknown choreography error: ${result.error}`);
    res.status(201).json({ id: result.value, message: 'Choreography created successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create choreography' });
  }
}

export async function checkDuplicateChoreographies(req, res) {
  try {
    return res.json(await choreographyReads.checkDuplicates(req.query));
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to check duplicates' });
  }
}

export async function getChoreographies(req, res) {
  try {
    res.json(await choreographyReads.listChoreographies(req.query));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreographies' });
  }
}

export async function getChoreographyById(req, res) {
  try {
    const result = await choreographyReads.getChoreography(req.params.id);
    if (result.error === 'not_found') {
      return res.status(404).json({ error: 'Choreography not found' });
    }
    if (result.error) throw new Error(`Unknown choreography error: ${result.error}`);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography' });
  }
}

export async function updateChoreography(req, res) {
  try {
    const result = await choreographyWrites.updateChoreography(req.params.id, req.body);
    if (result.error === 'not_found')
      return res.status(404).json({ error: 'Choreography not found' });
    if (result.error === 'validation') return sendChoreographyValidationError(res, result.issues);
    if (result.error) throw new Error(`Unknown choreography error: ${result.error}`);
    res.json({ id: req.params.id, message: 'Choreography updated successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update choreography' });
  }
}

export async function deleteChoreography(req, res) {
  try {
    const result = await choreographyWrites.deleteChoreography(req.params.id);
    if (result.error === 'not_found') {
      return res.status(404).json({ error: 'Choreography not found' });
    }
    if (result.error) throw new Error(`Unknown choreography error: ${result.error}`);
    res.json({ message: 'Choreography deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete choreography' });
  }
}
