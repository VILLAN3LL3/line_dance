import { runQuery, getQuery, allQuery } from '../db.js';

let savedFiltersTableReady = false;

async function ensureSavedFiltersTable() {
  if (savedFiltersTableReady) {
    return;
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS saved_filter_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      filters_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  savedFiltersTableReady = true;
}

function normalizeSavedFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    return {};
  }

  const normalized = {};

  if (typeof rawFilters.search === 'string' && rawFilters.search.trim()) {
    normalized.search = rawFilters.search.trim();
  }

  if (Array.isArray(rawFilters.level) && rawFilters.level.length > 0) {
    normalized.level = rawFilters.level.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
  }

  if (Array.isArray(rawFilters.step_figures) && rawFilters.step_figures.length > 0) {
    normalized.step_figures = rawFilters.step_figures.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
  }

  if (['all', 'any', 'exact'].includes(rawFilters.step_figures_match_mode)) {
    normalized.step_figures_match_mode = rawFilters.step_figures_match_mode;
  }

  if (rawFilters.without_step_figures === true) {
    normalized.without_step_figures = true;
  }

  if (Array.isArray(rawFilters.tags) && rawFilters.tags.length > 0) {
    normalized.tags = rawFilters.tags.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
  }

  if (Array.isArray(rawFilters.authors) && rawFilters.authors.length > 0) {
    normalized.authors = rawFilters.authors.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
  }

  const parsedMaxCount = Number.parseInt(String(rawFilters.max_count), 10);
  if (!Number.isNaN(parsedMaxCount) && parsedMaxCount >= 0) {
    normalized.max_count = parsedMaxCount;
  }

  return normalized;
}

function parseStoredFilters(storedValue) {
  try {
    const parsed = JSON.parse(storedValue || '{}');
    return normalizeSavedFilters(parsed);
  } catch (error) {
    console.warn('Invalid saved filter JSON detected, returning empty filter set', error);
    return {};
  }
}

export async function getSavedFilterConfigurations(req, res) {
  try {
    await ensureSavedFiltersTable();

    const rows = await allQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       ORDER BY LOWER(name) ASC`
    );

    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      filters: parseStoredFilters(row.filters_json),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));
  } catch (error) {
    console.error('Error loading saved filter configurations:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function saveFilterConfiguration(req, res) {
  try {
    await ensureSavedFiltersTable();

    const rawName = req.body?.name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'Configuration name is required' });
    }

    const filters = normalizeSavedFilters(req.body?.filters || {});
    const filtersJson = JSON.stringify(filters);

    await runQuery(
      `INSERT INTO saved_filter_configurations (name, filters_json)
       VALUES (?, ?)
       ON CONFLICT(name)
       DO UPDATE SET
         filters_json = excluded.filters_json,
         updated_at = CURRENT_TIMESTAMP`,
      [name, filtersJson]
    );

    const saved = await getQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       WHERE name = ?`,
      [name]
    );

    res.status(201).json({
      id: saved.id,
      name: saved.name,
      filters: parseStoredFilters(saved.filters_json),
      created_at: saved.created_at,
      updated_at: saved.updated_at,
      message: 'Filter configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving filter configuration:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateSavedFilterConfiguration(req, res) {
  try {
    await ensureSavedFiltersTable();

    const configurationId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(configurationId)) {
      return res.status(400).json({ error: 'Invalid configuration id' });
    }

    const existing = await getQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       WHERE id = ?`,
      [configurationId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Saved filter configuration not found' });
    }

    const hasNameUpdate = Object.hasOwn(req.body || {}, 'name');
    const hasFiltersUpdate = Object.hasOwn(req.body || {}, 'filters');

    if (!hasNameUpdate && !hasFiltersUpdate) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    let nextName = existing.name;
    if (hasNameUpdate) {
      const rawName = req.body?.name;
      const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
      if (!trimmedName) {
        return res.status(400).json({ error: 'Configuration name is required' });
      }
      nextName = trimmedName;
    }

    const nextFilters = hasFiltersUpdate
      ? normalizeSavedFilters(req.body?.filters || {})
      : parseStoredFilters(existing.filters_json);

    await runQuery(
      `UPDATE saved_filter_configurations
       SET name = ?, filters_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextName, JSON.stringify(nextFilters), configurationId]
    );

    const updated = await getQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       WHERE id = ?`,
      [configurationId]
    );

    res.json({
      id: updated.id,
      name: updated.name,
      filters: parseStoredFilters(updated.filters_json),
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      message: 'Filter configuration updated successfully',
    });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A configuration with that name already exists' });
    }
    console.error('Error updating filter configuration:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSavedFilterConfiguration(req, res) {
  try {
    await ensureSavedFiltersTable();

    const configurationId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(configurationId)) {
      return res.status(400).json({ error: 'Invalid configuration id' });
    }

    const result = await runQuery(
      'DELETE FROM saved_filter_configurations WHERE id = ?',
      [configurationId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved filter configuration not found' });
    }

    res.json({ message: 'Filter configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting filter configuration:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function createChoreography(req, res) {
  try {
    const { name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level, creation_year, tag_information, restart_information, authors, tags, step_figures } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    // Get level ID
    const levelRecord = await getQuery('SELECT id FROM levels WHERE name = ?', [level]);
    if (!levelRecord) {
      return res.status(400).json({ error: 'Invalid level. Must be one of: Beginner, Intermediate, Advanced, Experienced' });
    }

    // Insert choreography
    const choreoResult = await runQuery(
      `INSERT INTO choreographies (name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level_id, creation_year, tag_information, restart_information)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, step_sheet_link || null, demo_video_url || null, tutorial_video_url || null, count || null, wall_count || null, levelRecord.id, creation_year || null, tag_information || null, restart_information || null]
    );

    const choreography_id = choreoResult.id;

    // Insert authors
    if (authors && Array.isArray(authors)) {
      for (const author of authors) {
        let authorId = await getAuthorId(author);
        if (!authorId) {
          const result = await runQuery(`INSERT INTO authors (name) VALUES (?)`, [author]);
          authorId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)`,
          [choreography_id, authorId]
        );
      }
    }

    // Insert step figures
    if (step_figures && Array.isArray(step_figures)) {
      for (const figure of step_figures) {
        let figureId = await getStepFigureId(figure);
        if (!figureId) {
          const result = await runQuery(`INSERT INTO step_figures (name) VALUES (?)`, [figure]);
          figureId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?)`,
          [choreography_id, figureId]
        );
      }
    }

    // Insert tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        let tagId = await getTagId(tag);
        if (!tagId) {
          const result = await runQuery(`INSERT INTO tags (name) VALUES (?)`, [tag]);
          tagId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)`,
          [choreography_id, tagId]
        );
      }
    }

    res.status(201).json({ id: choreography_id, message: 'Choreography created successfully' });
  } catch (error) {
    console.error('Error creating choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getChoreographies(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const choreographies = await allQuery(
      `SELECT c.*, l.name as level FROM choreographies c
       LEFT JOIN levels l ON c.level_id = l.id
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Enrich with related data
    const enriched = await Promise.all(choreographies.map(c => enrichChoreography(c)));

    const count = await getQuery('SELECT COUNT(*) as count FROM choreographies');

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: count.count,
        totalPages: Math.ceil(count.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching choreographies:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getChoreographyById(req, res) {
  try {
    const choreography = await getQuery(
      'SELECT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id WHERE c.id = ?',
      [req.params.id]
    );

    if (!choreography) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const enriched = await enrichChoreography(choreography);
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateChoreography(req, res) {
  try {
    const { name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level, creation_year, tag_information, restart_information, authors, tags, step_figures } = req.body;
    const choreography_id = req.params.id;

    // Check if choreography exists
    const existing = await getQuery('SELECT id FROM choreographies WHERE id = ?', [choreography_id]);
    if (!existing) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    let levelId = null;
    if (level) {
      const levelRecord = await getQuery('SELECT id FROM levels WHERE name = ?', [level]);
      if (!levelRecord) {
        return res.status(400).json({ error: 'Invalid level. Must be one of: Beginner, Intermediate, Advanced, Experienced' });
      }
      levelId = levelRecord.id;
    }

    // Update main choreography
    const updateQuery = levelId
      ? `UPDATE choreographies 
         SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, level_id = ?, creation_year = ?, tag_information = ?, restart_information = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      : `UPDATE choreographies 
         SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, creation_year = ?, tag_information = ?, restart_information = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    const updateParams = levelId
      ? [name, step_sheet_link || null, demo_video_url || null, tutorial_video_url || null, count || null, wall_count || null, levelId, creation_year || null, tag_information || null, restart_information || null, choreography_id]
      : [name, step_sheet_link || null, demo_video_url || null, tutorial_video_url || null, count || null, wall_count || null, creation_year || null, tag_information || null, restart_information || null, choreography_id];

    await runQuery(updateQuery, updateParams);

    // Delete and re-insert authors
    if (authors !== undefined) {
      await runQuery('DELETE FROM choreography_authors WHERE choreography_id = ?', [choreography_id]);
      for (const author of authors) {
        let authorId = await getAuthorId(author);
        if (!authorId) {
          const result = await runQuery(`INSERT INTO authors (name) VALUES (?)`, [author]);
          authorId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)`,
          [choreography_id, authorId]
        );
      }
    }

    // Delete and re-insert step figures
    if (step_figures !== undefined) {
      await runQuery('DELETE FROM choreography_step_figures WHERE choreography_id = ?', [choreography_id]);
      for (const figure of step_figures) {
        let figureId = await getStepFigureId(figure);
        if (!figureId) {
          const result = await runQuery(`INSERT INTO step_figures (name) VALUES (?)`, [figure]);
          figureId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?)`,
          [choreography_id, figureId]
        );
      }
    }

    // Delete and re-insert tags
    if (tags !== undefined) {
      await runQuery('DELETE FROM choreography_tags WHERE choreography_id = ?', [choreography_id]);
      for (const tag of tags) {
        let tagId = await getTagId(tag);
        if (!tagId) {
          const result = await runQuery(`INSERT INTO tags (name) VALUES (?)`, [tag]);
          tagId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)`,
          [choreography_id, tagId]
        );
      }
    }

    res.json({ id: choreography_id, message: 'Choreography updated successfully' });
    await cleanupOrphanedRecords();
  } catch (error) {
    console.error('Error updating choreography:', error);
    res.status(500).json({ error: error.message });
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
       )`
    );

    // Delete orphaned tags (not used by any choreography)
    await runQuery(
      `DELETE FROM tags
       WHERE id NOT IN (
         SELECT DISTINCT tag_id FROM choreography_tags WHERE tag_id IS NOT NULL
       )`
    );

    // Delete orphaned step_figures (not used by any choreography)
    await runQuery(
      `DELETE FROM step_figures
       WHERE id NOT IN (
         SELECT DISTINCT step_figure_id FROM choreography_step_figures WHERE step_figure_id IS NOT NULL
       )`
    );

    // Delete orphaned levels (not used by any choreography)
    await runQuery(
      `DELETE FROM levels
       WHERE id NOT IN (
         SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL
       )`
    );

    // Also clean up any dangling join table entries for non-existent choreographies
    await runQuery(
      `DELETE FROM choreography_authors WHERE choreography_id NOT IN (SELECT id FROM choreographies)`
    );
    await runQuery(
      `DELETE FROM choreography_tags WHERE choreography_id NOT IN (SELECT id FROM choreographies)`
    );
    await runQuery(
      `DELETE FROM choreography_step_figures WHERE choreography_id NOT IN (SELECT id FROM choreographies)`
    );
  } catch (error) {
    console.error('Error cleaning up orphaned records:', error);
    // Don't throw - this is a cleanup operation and shouldn't break the main operation
  }
}

export async function deleteChoreography(req, res) {
  try {
    const choreography_id = req.params.id;

    // Remove join table entries first
    await runQuery('DELETE FROM choreography_authors WHERE choreography_id = ?', [choreography_id]);
    await runQuery('DELETE FROM choreography_tags WHERE choreography_id = ?', [choreography_id]);
    await runQuery('DELETE FROM choreography_step_figures WHERE choreography_id = ?', [choreography_id]);

    const result = await runQuery('DELETE FROM choreographies WHERE id = ?', [choreography_id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    // Clean up orphaned records
    await cleanupOrphanedRecords();

    res.json({ message: 'Choreography deleted successfully' });
  } catch (error) {
    console.error('Error deleting choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function searchChoreographies(req, res) {
  try {
    const { level, step_figures, step_figures_match_mode, without_step_figures, tags, authors, search, sort_field, sort_direction, max_count } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const matchMode = step_figures_match_mode || 'all';
    const noStepFigures = without_step_figures === 'true' || without_step_figures === true;

    let query = 'SELECT DISTINCT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
    let params = [];
    let joins = [];
    let conditions = [];
    let groupBy = '';
    let having = '';
    let havingParams = [];

    // Add search by name or other fields
    if (search) {
      conditions.push('c.name LIKE ?');
      params.push(`%${search}%`);
    }

    // Filter by level
    if (level) {
      const levelList = Array.isArray(level) ? level : [level];
      const placeholders = levelList.map(() => '?').join(',');
      conditions.push(`l.name IN (${placeholders})`);
      params.push(...levelList);
    }

    // Filter by step figures
    if (noStepFigures) {
      joins.push(`
        LEFT JOIN choreography_step_figures csfNo ON c.id = csfNo.choreography_id
      `);
      conditions.push('csfNo.choreography_id IS NULL');
    } else if (step_figures) {
      const figures = Array.isArray(step_figures) ? step_figures : [step_figures];

      // EXACT means choreography figures must be a non-empty subset of selected figures.
      if (matchMode === 'exact') {
        joins.push(`
          LEFT JOIN choreography_step_figures csf_all ON c.id = csf_all.choreography_id
          LEFT JOIN step_figures sf_all ON csf_all.step_figure_id = sf_all.id
        `);

        const placeholders = figures.map(() => '?').join(',');
        groupBy = ' GROUP BY c.id';
        having = ` HAVING COUNT(DISTINCT sf_all.id) > 0
                         AND COUNT(DISTINCT CASE WHEN sf_all.name IN (${placeholders}) THEN sf_all.id END) = COUNT(DISTINCT sf_all.id)`;
        havingParams.push(...figures);
      } else {
        // For 'all' and 'any' modes
        joins.push(`
          INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
          INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
        `);
        const placeholders = figures.map(() => '?').join(',');
        conditions.push(`sf.name IN (${placeholders})`);
        params.push(...figures);

        // If matching ALL figures, use GROUP BY and HAVING
        if (matchMode === 'all' && figures.length > 1) {
          groupBy = ' GROUP BY c.id';
          having = ` HAVING COUNT(DISTINCT sf.id) = ${figures.length}`;
        }
      }
    }

    // Filter by tags
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      joins.push(`
        INNER JOIN choreography_tags ct ON c.id = ct.choreography_id
        INNER JOIN tags t ON ct.tag_id = t.id
      `);
      const placeholders = tagList.map(() => '?').join(',');
      conditions.push(`t.name IN (${placeholders})`);
      params.push(...tagList);
    }

    // Filter by authors
    if (authors) {
      const authorList = Array.isArray(authors) ? authors : [authors];
      joins.push(`
        INNER JOIN choreography_authors ca ON c.id = ca.choreography_id
        INNER JOIN authors a ON ca.author_id = a.id
      `);
      const placeholders = authorList.map(() => '?').join(',');
      conditions.push(`a.name IN (${placeholders})`);
      params.push(...authorList);
    }

    if (max_count !== undefined) {
      const parsedMaxCount = Number.parseInt(String(max_count), 10);
      if (!Number.isNaN(parsedMaxCount) && parsedMaxCount >= 0) {
        conditions.push('(c.count IS NULL OR c.count <= ?)');
        params.push(parsedMaxCount);
      }
    }

    // Build final query
    if (joins.length > 0) {
      query += joins.join('');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (groupBy) {
      query += groupBy;
    }

    if (having) {
      query += having;
      params.push(...havingParams);
    }

    // Add sorting
    let orderBy = 'c.created_at DESC';
    if (sort_field) {
      const direction = sort_direction === 'desc' ? 'DESC' : 'ASC';
      switch (sort_field) {
        case 'name':
          orderBy = `LOWER(c.name) ${direction}`;
          break;
        case 'level':
          orderBy = `LOWER(l.name) ${direction}`;
          break;
        case 'count':
          orderBy = `c.count ${direction}`;
          break;
        case 'wall_count':
          orderBy = `c.wall_count ${direction}`;
          break;
        case 'creation_year':
          orderBy = `c.creation_year ${direction}`;
          break;
        default:
          orderBy = `c.created_at DESC`;
      }
    }

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const choreographies = await allQuery(query, params);
    const enriched = await Promise.all(choreographies.map(c => enrichChoreography(c)));

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT c.id) as count FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
    let countParams = [];
    let countConditions = [];
    let countGroupBy = '';
    let countHaving = '';
    let countHavingParams = [];

    if (search) {
      countConditions.push('c.name LIKE ?');
      countParams.push(`%${search}%`);
    }

    if (level) {
      const levelList = Array.isArray(level) ? level : [level];
      const placeholders = levelList.map(() => '?').join(',');
      countConditions.push(`l.name IN (${placeholders})`);
      countParams.push(...levelList);
    }

    if (noStepFigures) {
      countQuery += `
        LEFT JOIN choreography_step_figures csfNo ON c.id = csfNo.choreography_id
      `;
      countConditions.push('csfNo.choreography_id IS NULL');
    } else if (step_figures) {
      const figures = Array.isArray(step_figures) ? step_figures : [step_figures];

      if (matchMode === 'exact') {
        const placeholders = figures.map(() => '?').join(',');
        countQuery += `
          LEFT JOIN choreography_step_figures csf_all ON c.id = csf_all.choreography_id
          LEFT JOIN step_figures sf_all ON csf_all.step_figure_id = sf_all.id
        `;
        countGroupBy = ' GROUP BY c.id';
        countHaving = ` HAVING COUNT(DISTINCT sf_all.id) > 0
                            AND COUNT(DISTINCT CASE WHEN sf_all.name IN (${placeholders}) THEN sf_all.id END) = COUNT(DISTINCT sf_all.id)`;
        countHavingParams.push(...figures);
      } else {
        countQuery += `
          INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
          INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
        `;
        const placeholders = figures.map(() => '?').join(',');
        countConditions.push(`sf.name IN (${placeholders})`);
        countParams.push(...figures);

        if (matchMode === 'all' && figures.length > 1) {
          countGroupBy = ' GROUP BY c.id';
          countHaving = ` HAVING COUNT(DISTINCT sf.id) = ${figures.length}`;
        }
      }
    }

    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      countQuery += `
        INNER JOIN choreography_tags ct ON c.id = ct.choreography_id
        INNER JOIN tags t ON ct.tag_id = t.id
      `;
      const placeholders = tagList.map(() => '?').join(',');
      countConditions.push(`t.name IN (${placeholders})`);
      countParams.push(...tagList);
    }

    if (authors) {
      const authorList = Array.isArray(authors) ? authors : [authors];
      countQuery += `
        INNER JOIN choreography_authors ca ON c.id = ca.choreography_id
        INNER JOIN authors a ON ca.author_id = a.id
      `;
      const placeholders = authorList.map(() => '?').join(',');
      countConditions.push(`a.name IN (${placeholders})`);
      countParams.push(...authorList);
    }

    if (max_count !== undefined) {
      const parsedMaxCount = Number.parseInt(String(max_count), 10);
      if (!Number.isNaN(parsedMaxCount) && parsedMaxCount >= 0) {
        countConditions.push('(c.count IS NULL OR c.count <= ?)');
        countParams.push(parsedMaxCount);
      }
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    if (countGroupBy) {
      countQuery += countGroupBy;
    }

    if (countHaving) {
      countQuery += countHaving;
      countParams.push(...countHavingParams);
    }

    // Wrap in subquery to properly count with GROUP BY
    if (countGroupBy || countHaving) {
      countQuery = `SELECT COUNT(*) as count FROM (${countQuery})`;
    }

    const countResult = await getQuery(countQuery, countParams);

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    });
  } catch (error) {
    console.error('Error searching choreographies:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper functions
async function enrichChoreography(choreography) {
  const authors = await allQuery(
    `SELECT a.name FROM authors a
     INNER JOIN choreography_authors ca ON a.id = ca.author_id
     WHERE ca.choreography_id = ?`,
    [choreography.id]
  );

  const tags = await allQuery(
    `SELECT t.name FROM tags t
     INNER JOIN choreography_tags ct ON t.id = ct.tag_id
     WHERE ct.choreography_id = ?`,
    [choreography.id]
  );

  const step_figures = await allQuery(
    `SELECT sf.name FROM step_figures sf
     INNER JOIN choreography_step_figures csf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id = ?`,
    [choreography.id]
  );

  return {
    ...choreography,
    authors: authors.map(a => a.name),
    tags: tags.map(t => t.name),
    step_figures: step_figures.map(sf => sf.name)
  };
}

async function getAuthorId(name) {
  const result = await getQuery('SELECT id FROM authors WHERE name = ?', [name]);
  return result ? result.id : null;
}

async function getStepFigureId(name) {
  const result = await getQuery('SELECT id FROM step_figures WHERE name = ?', [name]);
  return result ? result.id : null;
}

async function getTagId(name) {
  const result = await getQuery('SELECT id FROM tags WHERE name = ?', [name]);
  return result ? result.id : null;
}

export async function getLevels(req, res) {
  try {
    const levels = await allQuery('SELECT id, name FROM levels ORDER BY id');
    res.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getTags(req, res) {
  try {
    const tags = await allQuery('SELECT name FROM tags ORDER BY name');
    res.json(tags.map(t => t.name));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getAuthors(req, res) {
  try {
    const authors = await allQuery('SELECT name FROM authors ORDER BY name');
    res.json(authors.map(a => a.name));
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function addLevel(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Level name is required' });
    }

    const result = await runQuery(
      'INSERT INTO levels (name) VALUES (?)',
      [name.trim()]
    );

    res.status(201).json({ id: result.id, name: name.trim() });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'This level already exists' });
    }
    console.error('Error adding level:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getStepFigures(req, res) {
  try {
    const figures = await allQuery('SELECT name FROM step_figures ORDER BY name');
    res.json(figures.map(f => f.name));
  } catch (error) {
    console.error('Error fetching step figures:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getMaxChoreographyCount(req, res) {
  try {
    const result = await getQuery('SELECT MAX(count) as max_count FROM choreographies WHERE count IS NOT NULL');
    const maxCount = result?.max_count || 0;
    res.json({ max_count: maxCount });
  } catch (error) {
    console.error('Error fetching max choreography count:', error);
    res.status(500).json({ error: error.message });
  }
}
