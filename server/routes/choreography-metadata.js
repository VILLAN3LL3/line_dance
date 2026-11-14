import * as metadata from '../features/metadata/flow.js';
import { captureError } from '../utils/choreographyRouteErrors.js';

const levelErrors = {
  name_required: [400, 'Level name is required'],
  duplicate_level: [400, 'This level already exists'],
  invalid_value: [400, 'Level value must be an integer'],
};

function sendLevelError(res, error) {
  const response = levelErrors[error];
  if (!response) throw new Error(`Unknown level error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getLevels(req, res) {
  try {
    res.json(await metadata.getLevels());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
}

export async function getTags(req, res) {
  try {
    res.json(await metadata.getTags());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

export async function getChoreographyInfoCategories(req, res) {
  try {
    res.json(await metadata.getInformationCategories());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography information categories' });
  }
}

export async function getAuthors(req, res) {
  try {
    res.json(await metadata.getAuthors());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
}

export async function getAuthorStats(req, res) {
  try {
    res.json(await metadata.getAuthorStats());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch author stats' });
  }
}

export async function addLevel(req, res) {
  try {
    const result = await metadata.addLevel(req.body);
    if (result.error) return sendLevelError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to add level' });
  }
}

export async function getMaxChoreographyCount(req, res) {
  try {
    res.json(await metadata.getMaxChoreographyCount());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch max choreography count' });
  }
}

export async function getCountryCodes(req, res) {
  try {
    res.json(await metadata.getCountryCodes());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch country codes' });
  }
}
