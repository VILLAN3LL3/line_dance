import { runQuery, getQuery } from '../scripts/db.js';
import { captureError } from './choreography-shared.js';

export async function rateChoreography(req, res) {
  try {
    const choreographyId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(choreographyId)) {
      return res.status(400).json({ error: 'Invalid choreography id' });
    }

    const existing = await getQuery('SELECT id FROM choreographies WHERE id = ?', [choreographyId]);
    if (!existing) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const raw = req.body?.rating;
    const rating = Number.parseInt(String(raw), 10);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 0 and 5' });
    }

    await runQuery(
      `INSERT INTO personal_data.choreography_ratings (choreography_id, rating)
       VALUES (?, ?)
       ON CONFLICT(choreography_id) DO UPDATE SET rating = excluded.rating`,
      [choreographyId, rating],
    );

    res.json({ choreography_id: choreographyId, rating });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
}

export async function deleteChoreographyRating(req, res) {
  try {
    const choreographyId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(choreographyId)) {
      return res.status(400).json({ error: 'Invalid choreography id' });
    }

    await runQuery('DELETE FROM personal_data.choreography_ratings WHERE choreography_id = ?', [
      choreographyId,
    ]);

    res.json({ message: 'Rating removed' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
}
