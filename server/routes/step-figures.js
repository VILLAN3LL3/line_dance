import { runQuery, getQuery, allQuery, withTransaction } from '../scripts/db.js';
import { captureError, normalizeIdArray, normalizeStringField } from './choreography-shared.js';

async function getStepFigureDetails() {
  const figures = await allQuery(
    `SELECT sf.id,
            sf.name,
            COALESCE(usage_counts.used_by_choreography_count, 0) AS used_by_choreography_count
     FROM step_figures sf
     LEFT JOIN (
       SELECT step_figure_id, COUNT(*) AS used_by_choreography_count
       FROM choreography_step_figures
       GROUP BY step_figure_id
     ) usage_counts ON usage_counts.step_figure_id = sf.id
     ORDER BY LOWER(sf.name) ASC, sf.id ASC`,
  );

  const relations = await allQuery(
    `SELECT sfc.parent_step_figure_id,
            sfc.child_step_figure_id,
            sfc.sort_order,
            parent.name AS parent_name,
            child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY sfc.sort_order ASC, LOWER(child.name) ASC, child.id ASC`,
  );

  const byId = new Map(
    figures.map((figure) => [
      figure.id,
      {
        id: figure.id,
        name: figure.name,
        components: [],
        parents: [],
        used_by_choreography_count: Number(figure.used_by_choreography_count || 0),
      },
    ]),
  );

  for (const relation of relations) {
    const parent = byId.get(relation.parent_step_figure_id);
    const child = byId.get(relation.child_step_figure_id);

    if (parent) {
      parent.components.push({
        id: relation.child_step_figure_id,
        name: relation.child_name,
      });
    }

    if (child) {
      child.parents.push({
        id: relation.parent_step_figure_id,
        name: relation.parent_name,
      });
    }
  }

  return Array.from(byId.values());
}

async function getStepFigureDetailById(stepFigureId) {
  const stepFigures = await getStepFigureDetails();
  return stepFigures.find((figure) => figure.id === stepFigureId) || null;
}

async function ensureStepFigureExists(stepFigureId) {
  const stepFigure = await getQuery('SELECT id, name FROM step_figures WHERE id = ?', [
    stepFigureId,
  ]);
  return stepFigure || null;
}

async function validateComponentIds(parentStepFigureId, componentIds) {
  if (componentIds.includes(parentStepFigureId)) {
    throw new Error('A step figure cannot contain itself');
  }

  if (componentIds.length === 0) {
    return;
  }

  const placeholders = componentIds.map(() => '?').join(',');
  const existingChildren = await allQuery(
    `SELECT id FROM step_figures WHERE id IN (${placeholders})`,
    componentIds,
  );

  if (existingChildren.length !== componentIds.length) {
    throw new Error('One or more component step figures do not exist');
  }

  await componentIds.reduce(
    (pendingValidation, componentId) =>
      pendingValidation.then(async () => {
        const cycleRow = await getQuery(
          `WITH RECURSIVE descendants(id) AS (
             SELECT child_step_figure_id
             FROM step_figure_components
             WHERE parent_step_figure_id = ?
             UNION
             SELECT sfc.child_step_figure_id
             FROM step_figure_components sfc
             INNER JOIN descendants ON descendants.id = sfc.parent_step_figure_id
           )
           SELECT 1 AS has_cycle
           FROM descendants
           WHERE id = ?
           LIMIT 1`,
          [componentId, parentStepFigureId],
        );

        if (cycleRow) {
          throw new Error('Step figure hierarchy cannot contain cycles');
        }
      }),
    Promise.resolve(),
  );
}

async function syncStepFigureComponents(parentStepFigureId, componentIds) {
  await runQuery('DELETE FROM step_figure_components WHERE parent_step_figure_id = ?', [
    parentStepFigureId,
  ]);

  await componentIds.reduce(
    (pendingInserts, componentId, index) =>
      pendingInserts.then(() =>
        runQuery(
          `INSERT INTO step_figure_components (
             parent_step_figure_id,
             child_step_figure_id,
             sort_order
           ) VALUES (?, ?, ?)`,
          [parentStepFigureId, componentId, index],
        ),
      ),
    Promise.resolve(),
  );
}

async function runStepFigureMutation(callback) {
  return withTransaction('choreography', callback);
}

export async function getStepFigures(req, res) {
  try {
    const figures = await allQuery('SELECT name FROM step_figures ORDER BY name');
    res.json(figures.map((f) => f.name));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figures' });
  }
}

export async function getStepFiguresWithIds(req, res) {
  try {
    const figures = await allQuery('SELECT id, name FROM step_figures ORDER BY name');
    res.json(figures);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figures' });
  }
}

export async function getStepFigureHierarchy(req, res) {
  try {
    const stepFigures = await getStepFigureDetails();
    res.json(stepFigures);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch step figure hierarchy' });
  }
}

export async function createStepFigure(req, res) {
  try {
    const name = normalizeStringField(req.body?.name);
    const componentIds = normalizeIdArray(req.body?.component_ids);

    if (!name) {
      return res.status(400).json({ error: 'Step figure name is required' });
    }

    const duplicate = await getQuery('SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?)', [
      name,
    ]);
    if (duplicate) {
      return res.status(400).json({ error: 'This step figure already exists' });
    }

    const createdId = await runStepFigureMutation(async () => {
      const created = await runQuery('INSERT INTO step_figures (name) VALUES (?)', [name]);
      await validateComponentIds(created.id, componentIds);
      await syncStepFigureComponents(created.id, componentIds);
      return created.id;
    });

    const created = await getStepFigureDetailById(createdId);
    res.status(201).json(created);
  } catch (error) {
    captureError(error);
    if (error.message?.includes('already exists')) {
      return res.status(400).json({ error: 'This step figure already exists' });
    }
    if (
      error.message?.includes('cannot contain itself') ||
      error.message?.includes('do not exist') ||
      error.message?.includes('cannot contain cycles')
    ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create step figure' });
  }
}

export async function updateStepFigure(req, res) {
  try {
    const stepFigureId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(stepFigureId)) {
      return res.status(400).json({ error: 'Invalid step figure id' });
    }

    const existing = await ensureStepFigureExists(stepFigureId);
    if (!existing) {
      return res.status(404).json({ error: 'Step figure not found' });
    }

    const name = normalizeStringField(req.body?.name);
    const componentIds = normalizeIdArray(req.body?.component_ids);

    if (!name) {
      return res.status(400).json({ error: 'Step figure name is required' });
    }

    const duplicate = await getQuery(
      'SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?) AND id != ?',
      [name, stepFigureId],
    );
    if (duplicate) {
      return res.status(400).json({ error: 'This step figure already exists' });
    }

    await runStepFigureMutation(async () => {
      await validateComponentIds(stepFigureId, componentIds);
      await runQuery('UPDATE step_figures SET name = ? WHERE id = ?', [name, stepFigureId]);
      await syncStepFigureComponents(stepFigureId, componentIds);
    });

    const updated = await getStepFigureDetailById(stepFigureId);
    res.json(updated);
  } catch (error) {
    captureError(error);
    if (
      error.message?.includes('already exists') ||
      error.message?.includes('cannot contain itself') ||
      error.message?.includes('do not exist') ||
      error.message?.includes('cannot contain cycles')
    ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update step figure' });
  }
}

export async function deleteStepFigure(req, res) {
  try {
    const stepFigureId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(stepFigureId)) {
      return res.status(400).json({ error: 'Invalid step figure id' });
    }

    const existing = await ensureStepFigureExists(stepFigureId);
    if (!existing) {
      return res.status(404).json({ error: 'Step figure not found' });
    }

    const usage = await getQuery(
      `SELECT
         (SELECT COUNT(*) FROM choreography_step_figures WHERE step_figure_id = ?) AS choreography_usage_count,
         (SELECT COUNT(*) FROM step_figure_components WHERE parent_step_figure_id = ?) AS component_count,
         (SELECT COUNT(*) FROM step_figure_components WHERE child_step_figure_id = ?) AS parent_count`,
      [stepFigureId, stepFigureId, stepFigureId],
    );

    if (Number(usage?.choreography_usage_count || 0) > 0) {
      return res.status(409).json({
        error: 'Step figure is assigned to choreographies and cannot be deleted',
      });
    }

    if (Number(usage?.parent_count || 0) > 0) {
      return res.status(409).json({
        error: 'Step figure is used as a component in another step figure and cannot be deleted',
      });
    }

    await runStepFigureMutation(async () => {
      await runQuery('DELETE FROM step_figure_components WHERE parent_step_figure_id = ?', [
        stepFigureId,
      ]);
      await runQuery('DELETE FROM step_figure_components WHERE child_step_figure_id = ?', [
        stepFigureId,
      ]);
      await runQuery('DELETE FROM step_figures WHERE id = ?', [stepFigureId]);
    });

    res.json({ message: 'Step figure deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete step figure' });
  }
}
