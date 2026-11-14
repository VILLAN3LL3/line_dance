import * as trainers from '../features/trainers/flow.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const trainerErrors = {
  name_required: [400, 'Name is required'],
  phone_required: [400, 'Phone is required'],
  email_required: [400, 'Email is required'],
  duplicate_email: [400, 'A trainer with that email already exists'],
  not_found: [404, 'Trainer not found'],
};

function sendTrainerError(res, error) {
  const response = trainerErrors[error];
  if (!response) throw new Error(`Unknown trainer error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getTrainers(req, res) {
  try {
    res.json(await trainers.getTrainers());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
}

export async function createTrainer(req, res) {
  try {
    const result = await trainers.createTrainer(req.body);
    if (result.error) return sendTrainerError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create trainer' });
  }
}

export async function updateTrainer(req, res) {
  try {
    const result = await trainers.updateTrainer(req.params.id, req.body);
    if (result.error) return sendTrainerError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update trainer' });
  }
}

export async function deleteTrainer(req, res) {
  try {
    const result = await trainers.deleteTrainer(req.params.id);
    if (result.error) return sendTrainerError(res, result.error);
    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete trainer' });
  }
}
