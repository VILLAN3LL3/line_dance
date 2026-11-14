import { runQuery, getQuery, allQuery } from '../scripts/db.js';
import { captureError, enrichChoreography, normalizeStringArray } from './choreography-shared.js';
import { getChoreographyValidationIssues } from './choreography-validation.js';

export * from './saved-filters.js';
export * from './choreography-ratings.js';
export * from './choreography-search.js';
export * from './choreography-metadata.js';
export * from './step-figures.js';

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
    const issues = await getChoreographyValidationIssues(req.body);
    if (issues.length) return sendChoreographyValidationError(res, issues);
    return res.json({ valid: true });
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to validate choreography' });
  }
}

export async function createChoreography(req, res) {
  try {
    const {
      name,
      step_sheet_link,
      demo_video_url,
      tutorial_video_url,
      count,
      wall_count,
      level,
      creation_year,
      choreography_information: rawChoreographyInformation,
      song,
      artist,
      authors,
      tags,
      step_figures,
    } = req.body;

    const issues = await getChoreographyValidationIssues(req.body);
    if (issues.length) return sendChoreographyValidationError(res, issues);
    const choreographyInformation = normalizeChoreographyInformation(rawChoreographyInformation);

    const levelRecord = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [
      level,
    ]);
    if (!levelRecord)
      return sendChoreographyValidationError(res, [{ field: 'level', key: 'invalid_level' }]);

    const choreoResult = await runQuery(
      `INSERT INTO choreographies (name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level_id, creation_year, song, artist)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        step_sheet_link || null,
        demo_video_url || null,
        tutorial_video_url || null,
        count || null,
        wall_count || null,
        levelRecord.id,
        creation_year || null,
        song || null,
        artist || null,
      ],
    );

    const choreography_id = choreoResult.id;

    await insertRelationship(
      choreography_id,
      authors,
      getAuthorId,
      'choreography_authors',
      'author_id',
      'authors',
    );
    await insertRelationship(
      choreography_id,
      step_figures,
      getStepFigureId,
      'choreography_step_figures',
      'step_figure_id',
      'step_figures',
    );
    await insertRelationship(
      choreography_id,
      tags,
      getTagId,
      'personal_data.choreography_tags',
      'tag_id',
      'personal_data.tags',
    );
    await replaceChoreographyInformation(choreography_id, choreographyInformation || []);

    res.status(201).json({ id: choreography_id, message: 'Choreography created successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create choreography' });
  }
}

export async function checkDuplicateChoreographies(req, res) {
  try {
    const { name, level, exclude_id } = req.query;
    const rawAuthors = req.query.authors;
    let coercedAuthors;
    if (Array.isArray(rawAuthors)) {
      coercedAuthors = rawAuthors;
    } else if (rawAuthors) {
      coercedAuthors = [rawAuthors];
    } else {
      coercedAuthors = [];
    }
    const authors = normalizeStringArray(coercedAuthors);

    if (!name || !level || authors.length === 0) {
      return res.json([]);
    }

    const excludeId = Number.parseInt(exclude_id, 10);
    const hasExcludeId = Number.isFinite(excludeId) && excludeId > 0;

    const authorUpperPlaceholders = authors.map(() => 'UPPER(?)').join(', ');
    const params = [name, level, ...(hasExcludeId ? [excludeId] : []), ...authors];

    const rows = await allQuery(
      `SELECT c.id, c.name, l.name AS level
       FROM choreographies c
       JOIN levels l ON c.level_id = l.id
       WHERE UPPER(c.name) = UPPER(?)
         AND UPPER(l.name) = UPPER(?)
         ${hasExcludeId ? 'AND c.id != ?' : ''}
         AND c.id IN (
           SELECT ca.choreography_id
           FROM choreography_authors ca
           JOIN authors a ON a.id = ca.author_id
           WHERE UPPER(a.name) IN (${authorUpperPlaceholders})
         )`,
      params,
    );

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const rowAuthors = await allQuery(
          `SELECT a.name FROM authors a
           JOIN choreography_authors ca ON ca.author_id = a.id
           WHERE ca.choreography_id = ?`,
          [row.id],
        );
        return { ...row, authors: rowAuthors.map((a) => a.name) };
      }),
    );

    return res.json(enriched);
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to check duplicates' });
  }
}

export async function getChoreographies(req, res) {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const choreographies = await allQuery(
      `SELECT c.*, l.name as level FROM choreographies c
       LEFT JOIN levels l ON c.level_id = l.id
       ORDER BY LOWER(c.name) ASC, COALESCE(l.value, 2147483647) ASC LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    // Enrich with related data
    const enriched = await Promise.all(choreographies.map((c) => enrichChoreography(c)));

    const count = await getQuery('SELECT COUNT(*) as count FROM choreographies');

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: count.count,
        totalPages: Math.ceil(count.count / limit),
      },
    });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreographies' });
  }
}

export async function getChoreographyById(req, res) {
  try {
    const choreography = await getQuery(
      'SELECT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id WHERE c.id = ?',
      [req.params.id],
    );

    if (!choreography) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const enriched = await enrichChoreography(choreography);
    res.json(enriched);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography' });
  }
}

export async function updateChoreography(req, res) {
  try {
    const {
      name,
      step_sheet_link,
      demo_video_url,
      tutorial_video_url,
      count,
      wall_count,
      level,
      creation_year,
      choreography_information: rawChoreographyInformation,
      song,
      artist,
      authors,
      tags,
      step_figures,
    } = req.body;
    const choreography_id = req.params.id;

    const existing = await getQuery('SELECT id FROM choreographies WHERE id = ?', [
      choreography_id,
    ]);
    if (!existing) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const issues = await getChoreographyValidationIssues(req.body, { partial: true });
    if (issues.length) return sendChoreographyValidationError(res, issues);
    const choreographyInformation = normalizeChoreographyInformation(rawChoreographyInformation);

    let levelId = null;
    if (level) {
      const levelRecord = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [
        level,
      ]);
      if (!levelRecord) {
        return sendChoreographyValidationError(res, [{ field: 'level', key: 'invalid_level' }]);
      }
      levelId = levelRecord.id;
    }

    const updateFields = [
      name,
      step_sheet_link || null,
      demo_video_url || null,
      tutorial_video_url || null,
      count || null,
      wall_count || null,
      creation_year || null,
      song || null,
      artist || null,
    ];
    const updateQuery = levelId
      ? `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, level_id = ?, creation_year = ?, song = ?, artist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      : `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, creation_year = ?, song = ?, artist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    const updateParams = levelId
      ? [...updateFields.slice(0, 6), levelId, ...updateFields.slice(6), choreography_id]
      : [...updateFields, choreography_id];
    await runQuery(updateQuery, updateParams);

    await deleteAndReinsertRelationships(
      choreography_id,
      authors,
      'choreography_authors',
      'author_id',
      'authors',
      getAuthorId,
    );
    await deleteAndReinsertRelationships(
      choreography_id,
      step_figures,
      'choreography_step_figures',
      'step_figure_id',
      'step_figures',
      getStepFigureId,
    );
    await deleteAndReinsertRelationships(
      choreography_id,
      tags,
      'personal_data.choreography_tags',
      'tag_id',
      'personal_data.tags',
      getTagId,
    );

    if (choreographyInformation !== undefined) {
      await replaceChoreographyInformation(choreography_id, choreographyInformation);
    }

    await cleanupOrphanedRecords();
    res.json({ id: choreography_id, message: 'Choreography updated successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update choreography' });
  }
}

// Helper function to clean up orphaned records
async function cleanupOrphanedRecords() {
  try {
    // Delete orphaned authors (not used by any choreography)
    await runQuery(
      `DELETE FROM authors
       WHERE id NOT IN (
         SELECT DISTINCT author_id FROM choreography_authors WHERE author_id IS NOT NULL
       )`,
    );

    // Delete orphaned tags (not used by any choreography)
    await runQuery(
      `DELETE FROM personal_data.tags
       WHERE id NOT IN (
         SELECT DISTINCT tag_id FROM personal_data.choreography_tags WHERE tag_id IS NOT NULL
       )`,
    );

    await runQuery(
      `DELETE FROM choreography_information
       WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );

    await cleanupUnusedChoreographyInfoCategories();

    // Delete orphaned non-canonical levels (not used by any choreography)
    const canonicalLevelNames = [
      'UNKNOWN',
      'ABSOLUTE BEGINNER',
      'EASY BEGINNER',
      'BEGINNER',
      'HIGH BEGINNER',
      'LOW IMPROVER',
      'EASY IMPROVER',
      'IMPROVER',
      'HIGH IMPROVER',
      'LOW INTERMEDIATE',
      'EASY INTERMEDIATE',
      'INTERMEDIATE',
      'HIGH INTERMEDIATE',
      'LOW ADVANCED',
      'EASY ADVANCED',
      'ADVANCED',
      'HIGH ADVANCED',
    ];
    const canonicalPlaceholders = canonicalLevelNames.map(() => 'UPPER(?)').join(',');
    await runQuery(
      `DELETE FROM levels
       WHERE id NOT IN (
         SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL
       )
       AND UPPER(name) NOT IN (${canonicalPlaceholders})`,
      canonicalLevelNames,
    );

    // Also clean up any dangling join table entries for non-existent choreographies
    await runQuery(
      `DELETE FROM choreography_authors WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );
    await runQuery(
      `DELETE FROM personal_data.choreography_tags WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );
    await runQuery(
      `DELETE FROM choreography_step_figures WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );
    await runQuery(
      `DELETE FROM step_figure_components
       WHERE parent_step_figure_id NOT IN (SELECT id FROM step_figures)
          OR child_step_figure_id NOT IN (SELECT id FROM step_figures)`,
    );
  } catch (error) {
    captureError(error);
    // Don't throw - this is a cleanup operation and shouldn't break the main operation
  }
}

function normalizeChoreographyInformation(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.category !== 'string' || typeof item.description !== 'string') return null;

    const category = item.category.trim();
    const description = item.description.trim();
    if (category && description) normalized.push({ category, description });
  }

  return normalized;
}

async function replaceChoreographyInformation(choreographyId, information) {
  await runQuery('DELETE FROM choreography_information WHERE choreography_id = ?', [
    choreographyId,
  ]);

  await information.reduce(
    (previous, item) =>
      previous.then(async () => {
        await runQuery(
          `INSERT OR IGNORE INTO choreography_info_categories (name, is_seeded) VALUES (?, 0)`,
          [item.category],
        );
        const category = await getQuery(
          `SELECT id FROM choreography_info_categories WHERE name = ?`,
          [item.category],
        );
        await runQuery(
          `INSERT INTO choreography_information (choreography_id, category_id, description)
           VALUES (?, ?, ?)`,
          [choreographyId, category.id, item.description],
        );
      }),
    Promise.resolve(),
  );

  await cleanupUnusedChoreographyInfoCategories();
}

async function cleanupUnusedChoreographyInfoCategories() {
  await runQuery(
    `DELETE FROM choreography_info_categories
     WHERE is_seeded = 0
       AND NOT EXISTS (
         SELECT 1 FROM choreography_information
         WHERE choreography_information.category_id = choreography_info_categories.id
       )`,
  );
}

export async function deleteChoreography(req, res) {
  try {
    const choreography_id = req.params.id;

    // Remove join table entries first
    await runQuery('DELETE FROM choreography_information WHERE choreography_id = ?', [
      choreography_id,
    ]);
    await runQuery('DELETE FROM choreography_authors WHERE choreography_id = ?', [choreography_id]);
    await runQuery('DELETE FROM personal_data.choreography_tags WHERE choreography_id = ?', [
      choreography_id,
    ]);
    await runQuery('DELETE FROM choreography_step_figures WHERE choreography_id = ?', [
      choreography_id,
    ]);

    const result = await runQuery('DELETE FROM choreographies WHERE id = ?', [choreography_id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    // Clean up orphaned records
    await cleanupOrphanedRecords();

    res.json({ message: 'Choreography deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete choreography' });
  }
}

async function insertRelationship(
  choreography_id,
  items,
  getItemId,
  relationshipTable,
  relationshipIdCol,
  creationTable,
) {
  if (!items || !Array.isArray(items)) return;
  await items.reduce(
    (pendingInserts, item) =>
      pendingInserts.then(async () => {
        let itemId = await getItemId(item);
        if (!itemId) {
          const result = await runQuery(`INSERT INTO ${creationTable} (name) VALUES (?)`, [item]);
          itemId = result.id;
        }
        await runQuery(
          `INSERT INTO ${relationshipTable} (choreography_id, ${relationshipIdCol}) VALUES (?, ?)`,
          [choreography_id, itemId],
        );
      }),
    Promise.resolve(),
  );
}

async function deleteAndReinsertRelationships(
  choreography_id,
  items,
  relationshipTable,
  relationshipIdCol,
  creationTable,
  getIdFn,
) {
  if (items === undefined) return;
  await runQuery(`DELETE FROM ${relationshipTable} WHERE choreography_id = ?`, [choreography_id]);
  if (Array.isArray(items) && items.length > 0) {
    await insertRelationship(
      choreography_id,
      items,
      getIdFn,
      relationshipTable,
      relationshipIdCol,
      creationTable,
    );
  }
}

async function getAuthorId(name) {
  const result = await getQuery('SELECT id FROM authors WHERE UPPER(name) = UPPER(?)', [name]);
  return result ? result.id : null;
}

async function getStepFigureId(name) {
  const result = await getQuery('SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?)', [name]);
  return result ? result.id : null;
}

async function getTagId(name) {
  const result = await getQuery('SELECT id FROM personal_data.tags WHERE UPPER(name) = UPPER(?)', [
    name,
  ]);
  return result ? result.id : null;
}
