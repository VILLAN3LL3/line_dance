import { runQuery, getQuery, allQuery, withTransaction } from '../scripts/db.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const dbName = 'danceGroups';

// Trainers endpoints

export async function getTrainers(req, res) {
  try {
    const rows = await allQuery(
      `SELECT id, name, phone, email, created_at FROM trainers ORDER BY LOWER(name) ASC`,
      [],
      dbName,
    );
    res.json(rows);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
}

export async function createTrainer(req, res) {
  try {
    const { name, phone, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await runQuery(
      `INSERT INTO trainers (name, phone, email) VALUES (?, ?, ?)`,
      [name.trim(), phone.trim(), email.trim()],
      dbName,
    );

    const trainer = await getQuery(
      `SELECT id, name, phone, email, created_at FROM trainers WHERE id = ?`,
      [result.id],
      dbName,
    );

    res.status(201).json(trainer);
  } catch (error) {
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A trainer with that email already exists' });
    }
    res.status(500).json({ error: 'Failed to create trainer' });
  }
}

export async function updateTrainer(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = await getQuery(`SELECT id FROM trainers WHERE id = ?`, [id], dbName);

    if (!existing) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    await runQuery(
      `UPDATE trainers SET name = ?, phone = ?, email = ? WHERE id = ?`,
      [name.trim(), phone.trim(), email.trim(), id],
      dbName,
    );

    const updated = await getQuery(
      `SELECT id, name, phone, email, created_at FROM trainers WHERE id = ?`,
      [id],
      dbName,
    );

    res.json(updated);
  } catch (error) {
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A trainer with that email already exists' });
    }
    res.status(500).json({ error: 'Failed to update trainer' });
  }
}

export async function deleteTrainer(req, res) {
  try {
    const { id } = req.params;

    const result = await withTransaction(dbName, async () => {
      await runQuery(
        `UPDATE dance_courses SET trainer_id = NULL WHERE trainer_id = ?`,
        [id],
        dbName,
      );
      return runQuery(`DELETE FROM trainers WHERE id = ?`, [id], dbName);
    });

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete trainer' });
  }
}
