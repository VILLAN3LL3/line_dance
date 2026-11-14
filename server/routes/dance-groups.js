import { runQuery, getQuery, allQuery } from '../scripts/db.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';
import { createGroupWithDefaults, replaceBaseFigures } from './dance-group-flow.js';

const dbName = 'danceGroups';

// Dance Groups endpoints

export async function getDanceGroups(req, res) {
  try {
    const rows = await allQuery(
      `SELECT id, name, max_group_level_value, created_at FROM dance_groups ORDER BY name ASC`,
      [],
      dbName,
    );
    res.json(rows);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance groups' });
  }
}

export async function createDanceGroup(req, res) {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const group = await createGroupWithDefaults(name.trim());
    res.status(201).json(group);
  } catch (error) {
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A dance group with that name already exists' });
    }
    res.status(500).json({ error: 'Failed to create dance group' });
  }
}

export async function getDanceGroupById(req, res) {
  try {
    const { id } = req.params;
    const group = await getQuery(
      `SELECT id, name, max_group_level_value, created_at FROM dance_groups WHERE id = ?`,
      [id],
      dbName,
    );

    if (!group) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    res.json(group);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance group' });
  }
}

export async function updateDanceGroup(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await getQuery(`SELECT id FROM dance_groups WHERE id = ?`, [id], dbName);

    if (!existing) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    await runQuery(`UPDATE dance_groups SET name = ? WHERE id = ?`, [name.trim(), id], dbName);

    const updated = await getQuery(
      `SELECT id, name, max_group_level_value, created_at FROM dance_groups WHERE id = ?`,
      [id],
      dbName,
    );

    res.json(updated);
  } catch (error) {
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A dance group with that name already exists' });
    }
    res.status(500).json({ error: 'Failed to update dance group' });
  }
}

export async function getGroupMaxLevel(req, res) {
  try {
    const { groupId } = req.params;
    const parsedGroupId = Number.parseInt(groupId, 10);

    if (!groupId || !Number.isFinite(parsedGroupId)) {
      return res.status(400).json({ error: 'Valid group ID is required' });
    }

    const group = await getQuery(
      `SELECT id, max_group_level_value FROM dance_groups WHERE id = ?`,
      [parsedGroupId],
      dbName,
    );

    if (!group) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    return res.json({ max_group_level_value: group.max_group_level_value ?? null });
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to fetch group max level' });
  }
}

export async function updateGroupMaxLevel(req, res) {
  try {
    const { groupId } = req.params;
    const parsedGroupId = Number.parseInt(groupId, 10);

    if (!groupId || !Number.isFinite(parsedGroupId)) {
      return res.status(400).json({ error: 'Valid group ID is required' });
    }

    const rawValue = req.body?.max_group_level_value;
    let maxGroupLevelValue = null;

    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      const parsedValue = Number.parseInt(String(rawValue), 10);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return res
          .status(400)
          .json({ error: 'max_group_level_value must be a non-negative integer or null' });
      }
      maxGroupLevelValue = parsedValue;
    }

    const existing = await getQuery(
      `SELECT id FROM dance_groups WHERE id = ?`,
      [parsedGroupId],
      dbName,
    );
    if (!existing) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    await runQuery(
      `UPDATE dance_groups
       SET max_group_level_value = ?
       WHERE id = ?`,
      [maxGroupLevelValue, parsedGroupId],
      dbName,
    );

    const updated = await getQuery(
      `SELECT id, max_group_level_value FROM dance_groups WHERE id = ?`,
      [parsedGroupId],
      dbName,
    );

    return res.json({ max_group_level_value: updated.max_group_level_value ?? null });
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to update group max level' });
  }
}

export async function getGroupBaseStepFigures(req, res) {
  try {
    const groupId = Number.parseInt(req.params.groupId, 10);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }
    const group = await getQuery('SELECT id FROM dance_groups WHERE id = ?', [groupId], dbName);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const rows = await allQuery(
      'SELECT step_figure_id FROM group_base_step_figures WHERE dance_group_id = ? ORDER BY step_figure_id ASC',
      [groupId],
      dbName,
    );
    if (rows.length === 0) return res.json([]);

    const ids = rows.map((r) => r.step_figure_id);
    const figures = await allQuery(
      `SELECT id, name FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name ASC`,
      ids,
    );
    return res.json(figures);
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to fetch base step figures' });
  }
}

export async function updateGroupBaseStepFigures(req, res) {
  try {
    const groupId = Number.parseInt(req.params.groupId, 10);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }
    const group = await getQuery('SELECT id FROM dance_groups WHERE id = ?', [groupId], dbName);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const { step_figure_ids } = req.body;
    if (
      !Array.isArray(step_figure_ids) ||
      !step_figure_ids.every((id) => Number.isInteger(id) && id > 0)
    ) {
      return res
        .status(400)
        .json({ error: 'step_figure_ids must be an array of positive integers' });
    }

    const ids = await replaceBaseFigures(groupId, step_figure_ids);
    if (!ids) return res.status(404).json({ error: 'Group not found' });
    if (ids.length === 0) return res.json([]);

    const figures = await allQuery(
      `SELECT id, name FROM step_figures WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name ASC`,
      ids,
    );
    return res.json(figures);
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to update base step figures' });
  }
}

export async function deleteDanceGroup(req, res) {
  try {
    const { id } = req.params;
    const result = await runQuery(`DELETE FROM dance_groups WHERE id = ?`, [id], dbName);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dance group not found' });
    }

    res.json({ message: 'Dance group deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete dance group' });
  }
}
