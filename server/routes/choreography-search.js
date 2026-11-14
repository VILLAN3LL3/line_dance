import { searchChoreographies as search } from '../features/choreographies/read-flow.js';
import { captureError } from '../utils/choreographyRouteErrors.js';

export async function searchChoreographies(req, res) {
  try {
    res.json(await search(req.query));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to search choreographies' });
  }
}
