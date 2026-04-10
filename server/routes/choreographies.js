import { runQuery, getQuery, allQuery } from '../scripts/db.js';

let savedFiltersTableReady = false;

function captureError(error) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const details = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`[choreographies] ${details}\n`);
}

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

export function normalizeSavedFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    return {};
  }

  const normalized = {};
  const search = normalizeStringField(rawFilters.search);
  if (search) normalized.search = search;

  const level = normalizeStringArray(rawFilters.level);
  if (level.length > 0) normalized.level = level;

  const stepFigures = normalizeStringArray(rawFilters.step_figures);
  if (stepFigures.length > 0) normalized.step_figures = stepFigures;

  if (['all', 'any', 'exact'].includes(rawFilters.step_figures_match_mode)) {
    normalized.step_figures_match_mode = rawFilters.step_figures_match_mode;
  }

  if (rawFilters.without_step_figures === true) {
    normalized.without_step_figures = true;
  }

  const tags = normalizeStringArray(rawFilters.tags);
  if (tags.length > 0) normalized.tags = tags;

  const authors = normalizeStringArray(rawFilters.authors);
  if (authors.length > 0) normalized.authors = authors;

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
    captureError(error);
    return {};
  }
}

export async function getSavedFilterConfigurations(req, res) {
  try {
    await ensureSavedFiltersTable();

    const rows = await allQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       ORDER BY LOWER(name) ASC`,
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        filters: parseStoredFilters(row.filters_json),
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    );
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to load configurations' });
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
      [name, filtersJson],
    );

    const saved = await getQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       WHERE name = ?`,
      [name],
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
    captureError(error);
    res.status(500).json({ error: 'Failed to save configuration' });
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
      [configurationId],
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
      [nextName, JSON.stringify(nextFilters), configurationId],
    );

    const updated = await getQuery(
      `SELECT id, name, filters_json, created_at, updated_at
       FROM saved_filter_configurations
       WHERE id = ?`,
      [configurationId],
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
    captureError(error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A configuration with that name already exists' });
    }
    res.status(500).json({ error: 'Failed to update configuration' });
  }
}

export async function deleteSavedFilterConfiguration(req, res) {
  try {
    await ensureSavedFiltersTable();

    const configurationId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(configurationId)) {
      return res.status(400).json({ error: 'Invalid configuration id' });
    }

    const result = await runQuery('DELETE FROM saved_filter_configurations WHERE id = ?', [
      configurationId,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved filter configuration not found' });
    }

    res.json({ message: 'Filter configuration deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete configuration' });
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
      tag_information,
      restart_information,
      authors,
      tags,
      step_figures,
    } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    const levelRecord = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [level]);
    if (!levelRecord) {
      return res.status(400).json({
        error: 'Invalid level. Must be one of: Beginner, Intermediate, Advanced, Experienced',
      });
    }

    const choreoResult = await runQuery(
      `INSERT INTO choreographies (name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level_id, creation_year, tag_information, restart_information)
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
        tag_information || null,
        restart_information || null,
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
      'personal_tags.choreography_tags',
      'tag_id',
      'personal_tags.tags',
    );

    res.status(201).json({ id: choreography_id, message: 'Choreography created successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create choreography' });
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
      tag_information,
      restart_information,
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

    let levelId = null;
    if (level) {
      const levelRecord = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [level]);
      if (!levelRecord) {
        return res.status(400).json({
          error: 'Invalid level. Must be one of: Beginner, Intermediate, Advanced, Experienced',
        });
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
      tag_information || null,
      restart_information || null,
    ];
    const updateQuery = levelId
      ? `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, level_id = ?, creation_year = ?, tag_information = ?, restart_information = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      : `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, creation_year = ?, tag_information = ?, restart_information = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

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
      'personal_tags.choreography_tags',
      'tag_id',
      'personal_tags.tags',
      getTagId,
    );

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
      `DELETE FROM personal_tags.tags
       WHERE id NOT IN (
         SELECT DISTINCT tag_id FROM personal_tags.choreography_tags WHERE tag_id IS NOT NULL
       )`,
    );

    // Delete orphaned step_figures (not used by any choreography)
    await runQuery(
      `DELETE FROM step_figures
       WHERE id NOT IN (
         SELECT DISTINCT step_figure_id FROM choreography_step_figures WHERE step_figure_id IS NOT NULL
       )`,
    );

    // Delete orphaned levels (not used by any choreography)
    await runQuery(
      `DELETE FROM levels
       WHERE id NOT IN (
         SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL
       )`,
    );

    // Also clean up any dangling join table entries for non-existent choreographies
    await runQuery(
      `DELETE FROM choreography_authors WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );
    await runQuery(
      `DELETE FROM personal_tags.choreography_tags WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );
    await runQuery(
      `DELETE FROM choreography_step_figures WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
    );
  } catch (error) {
    captureError(error);
    // Don't throw - this is a cleanup operation and shouldn't break the main operation
  }
}

export async function deleteChoreography(req, res) {
  try {
    const choreography_id = req.params.id;

    // Remove join table entries first
    await runQuery('DELETE FROM choreography_authors WHERE choreography_id = ?', [choreography_id]);
    await runQuery('DELETE FROM personal_tags.choreography_tags WHERE choreography_id = ?', [
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

function buildFilterConditions(filterObj) {
  const {
    search,
    level,
    step_figures,
    step_figures_match_mode,
    without_step_figures,
    tags,
    authors,
  } = filterObj;
  const conditions = [];
  const params = [];
  const joins = [];

  if (search) {
    // Normalize smart/curly apostrophes in both source and query for consistent title matching.
    conditions.push("REPLACE(REPLACE(c.name, char(8217), ''''), char(8216), '''') LIKE ?");
    params.push(`%${normalizeSearchText(search)}%`);
  }

  if (level) {
    const levelList = normalizeQueryParam(level);
    const placeholders = levelList.map(() => 'UPPER(?)').join(',');
    conditions.push(`UPPER(l.name) IN (${placeholders})`);
    params.push(...levelList);
  }

  const stepFilter = buildStepFiguresFilter(
    step_figures,
    step_figures_match_mode,
    without_step_figures,
  );
  joins.push(...stepFilter.joins);
  conditions.push(...stepFilter.conditions);
  params.push(...stepFilter.params);

  const tagsFilter = buildRelationshipFilter(
    tags,
    'personal_tags.choreography_tags',
    'tag_id',
    'personal_tags.tags',
  );
  joins.push(...tagsFilter.joins);
  conditions.push(...tagsFilter.conditions);
  params.push(...tagsFilter.params);

  const authorsFilter = buildRelationshipFilter(
    authors,
    'choreography_authors',
    'author_id',
    'authors',
  );
  joins.push(...authorsFilter.joins);
  conditions.push(...authorsFilter.conditions);
  params.push(...authorsFilter.params);

  return { conditions, params, joins, stepFilter };
}

export async function searchChoreographies(req, res) {
  try {
    const {
      level,
      step_figures,
      step_figures_match_mode,
      without_step_figures,
      tags,
      authors,
      search,
    } = req.query;
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { conditions, params, joins, stepFilter } = buildFilterConditions({
      search,
      level,
      step_figures,
      step_figures_match_mode,
      without_step_figures,
      tags,
      authors,
    });

    // Build count params before adding pagination params
    const countParams = [...params];
    if (stepFilter.having) {
      countParams.push(...stepFilter.havingParams);
    }

    let query =
      'SELECT DISTINCT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
    query += joins.map((j) => ` ${j}`).join('');

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (stepFilter.groupBy) {
      query += stepFilter.groupBy;
    }

    if (stepFilter.having) {
      query += stepFilter.having;
      params.push(...stepFilter.havingParams);
    }

    query += ' ORDER BY LOWER(c.name) ASC, COALESCE(l.value, 2147483647) ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const choreographies = await allQuery(query, params);
    const enriched = await Promise.all(choreographies.map((c) => enrichChoreography(c)));

    // Build count query
    let countQuery =
      'SELECT COUNT(DISTINCT c.id) as count FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
    countQuery += joins.map((j) => ` ${j}`).join('');

    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    if (stepFilter.groupBy) {
      countQuery += stepFilter.groupBy;
    }

    if (stepFilter.having) {
      countQuery += stepFilter.having;
    }

    if (stepFilter.groupBy || stepFilter.having) {
      countQuery = `SELECT COUNT(*) as count FROM (${countQuery})`;
    }

    const countResult = await getQuery(countQuery, countParams);

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to search choreographies' });
  }
}

function normalizeQueryParam(param) {
  if (Array.isArray(param)) {
    return param;
  }
  if (param && typeof param === 'object') {
    return Object.values(param)
      .filter((value) => value !== undefined && value !== null)
      .map(String);
  }
  return param ? [param] : [];
}

function normalizeMatchMode(rawMode) {
  const modeValue = Array.isArray(rawMode) ? rawMode.at(-1) : rawMode;
  if (typeof modeValue !== 'string') {
    return 'all';
  }

  const normalized = modeValue.trim().toLowerCase();
  return ['all', 'any', 'exact'].includes(normalized) ? normalized : 'all';
}

function normalizeSearchText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  const normalized = rawText
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    .trim()
    .replace(/\s+/g, ' ');

  // Support users typing quoted titles, e.g. "Bohemian Rhapsody".
  const wrappedInSameQuote =
    normalized.length >= 2 &&
    ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")));

  return wrappedInSameQuote ? normalized.slice(1, -1).trim() : normalized;
}

function buildStepFiguresFilter(step_figures, step_figures_match_mode, without_step_figures) {
  const result = {
    joins: [],
    conditions: [],
    groupBy: '',
    having: '',
    havingParams: [],
    params: [],
  };
  const matchMode = normalizeMatchMode(step_figures_match_mode);
  const noStepFigures = without_step_figures === 'true' || without_step_figures === true;

  if (noStepFigures) {
    result.joins = ['LEFT JOIN choreography_step_figures csfNo ON c.id = csfNo.choreography_id'];
    result.conditions = ['csfNo.choreography_id IS NULL'];
  } else if (step_figures) {
    const figures = normalizeQueryParam(step_figures);
    if (figures.length > 0) {
      if (matchMode === 'exact') {
        result.joins = [
          'LEFT JOIN choreography_step_figures csf_all ON c.id = csf_all.choreography_id',
          'LEFT JOIN step_figures sf_all ON csf_all.step_figure_id = sf_all.id',
        ];
        const placeholders = figures.map(() => '?').join(',');
        result.groupBy = ' GROUP BY c.id';
        result.having = ` HAVING COUNT(DISTINCT sf_all.id) > 0 AND COUNT(DISTINCT CASE WHEN sf_all.name IN (${placeholders}) THEN sf_all.id END) = COUNT(DISTINCT sf_all.id)`;
        result.havingParams = figures;
      } else {
        result.joins = [
          'INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id',
          'INNER JOIN step_figures sf ON csf.step_figure_id = sf.id',
        ];
        const placeholders = figures.map(() => '?').join(',');
        result.conditions = [`sf.name IN (${placeholders})`];
        result.params = figures;
        if (matchMode === 'all' && figures.length > 1) {
          result.groupBy = ' GROUP BY c.id';
          result.having = ` HAVING COUNT(DISTINCT sf.id) = ${figures.length}`;
        }
      }
    }
  }
  return result;
}

function buildRelationshipFilter(items, relationshipTable, relationshipPkCol, entityTable) {
  const result = { joins: [], conditions: [], params: [] };
  const itemList = normalizeQueryParam(items);
  if (itemList.length > 0) {
    result.joins = [
      `INNER JOIN ${relationshipTable} ON c.id = ${relationshipTable}.choreography_id`,
      `INNER JOIN ${entityTable} ON ${relationshipTable}.${relationshipPkCol} = ${entityTable}.id`,
    ];
    const placeholders = itemList.map(() => '?').join(',');
    result.conditions = [`${entityTable}.name IN (${placeholders})`];
    result.params = itemList;
  }
  return result;
}

// Helper functions
function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
}

function normalizeStringField(value) {
  return typeof value === 'string' ? value.trim() : '';
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
  for (const item of items) {
    let itemId = await getItemId(item);
    if (!itemId) {
      const result = await runQuery(`INSERT INTO ${creationTable} (name) VALUES (?)`, [item]);
      itemId = result.id;
    }
    await runQuery(
      `INSERT INTO ${relationshipTable} (choreography_id, ${relationshipIdCol}) VALUES (?, ?)`,
      [choreography_id, itemId],
    );
  }
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

async function enrichChoreography(choreography) {
  const authors = await allQuery(
    `SELECT a.name FROM authors a
     INNER JOIN choreography_authors ca ON a.id = ca.author_id
     WHERE ca.choreography_id = ?`,
    [choreography.id],
  );

  const tags = await allQuery(
    `SELECT t.name FROM personal_tags.tags t
     INNER JOIN personal_tags.choreography_tags ct ON t.id = ct.tag_id
     WHERE ct.choreography_id = ?`,
    [choreography.id],
  );

  const step_figures = await allQuery(
    `SELECT sf.name FROM step_figures sf
     INNER JOIN choreography_step_figures csf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id = ?`,
    [choreography.id],
  );

  return {
    ...choreography,
    authors: authors.map((a) => a.name),
    tags: tags.map((t) => t.name),
    step_figures: step_figures.map((sf) => sf.name),
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
  const result = await getQuery('SELECT id FROM personal_tags.tags WHERE name = ?', [name]);
  return result ? result.id : null;
}

export async function getLevels(req, res) {
  try {
    const levels = await allQuery('SELECT id, name, value FROM levels ORDER BY value ASC, LOWER(name) ASC');
    res.json(levels);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
}

export async function getTags(req, res) {
  try {
    const tags = await allQuery('SELECT name FROM personal_tags.tags ORDER BY name');
    res.json(tags.map((t) => t.name));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

export async function getAuthors(req, res) {
  try {
    const authors = await allQuery('SELECT name FROM authors ORDER BY name');
    res.json(authors.map((a) => a.name));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
}

export async function addLevel(req, res) {
  try {
    const { name, value } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Level name is required' });
    }

    const normalizedName = name.trim();
    const existing = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [
      normalizedName,
    ]);
    if (existing) {
      return res.status(400).json({ error: 'This level already exists' });
    }

    let numericValue;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      numericValue = Number.parseInt(String(value), 10);
      if (Number.isNaN(numericValue)) {
        return res.status(400).json({ error: 'Level value must be an integer' });
      }
    } else {
      const maxValue = await getQuery(`SELECT COALESCE(MAX(value), 0) AS max_value FROM levels`);
      numericValue = Number(maxValue?.max_value || 0) + 10;
    }

    const result = await runQuery('INSERT INTO levels (name, value) VALUES (?, ?)', [
      normalizedName,
      numericValue,
    ]);

    res.status(201).json({ id: result.id, name: normalizedName, value: numericValue });
  } catch (error) {
    captureError(error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'This level already exists' });
    }
    res.status(500).json({ error: 'Failed to add level' });
  }
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

export async function getMaxChoreographyCount(req, res) {
  try {
    const result = await getQuery(
      'SELECT MAX(count) as max_count FROM choreographies WHERE count IS NOT NULL',
    );
    const maxCount = result?.max_count || 0;
    res.json({ max_count: maxCount });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch max choreography count' });
  }
}
