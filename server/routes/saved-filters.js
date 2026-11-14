import { runQuery, getQuery, allQuery, withTransaction } from '../scripts/db.js';
import {
  captureError,
  normalizeStringArray,
  normalizeStringField,
  normalizeNonNegativeInteger,
} from './choreography-shared.js';

let savedFiltersTableReady = false;

async function ensureSavedFiltersTable() {
  if (savedFiltersTableReady) {
    return;
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS personal_data.saved_filter_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      filters_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  savedFiltersTableReady = true;
}

function assignNonEmptyArray(target, key, rawValue) {
  const arr = normalizeStringArray(rawValue);
  if (arr.length > 0) target[key] = arr;
}

export function normalizeSavedFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    return {};
  }

  const normalized = {};
  const search = normalizeStringField(rawFilters.search);
  if (search) normalized.search = search;

  const songArtist = normalizeStringField(rawFilters.song_artist);
  if (songArtist) normalized.song_artist = songArtist;

  const level = normalizeStringArray(rawFilters.level);
  if (level.length > 0) normalized.level = level;

  const parsedMaxLevelValue = normalizeNonNegativeInteger(rawFilters.max_level_value);
  if (parsedMaxLevelValue !== null) {
    normalized.max_level_value = parsedMaxLevelValue;
  }

  assignNonEmptyArray(normalized, 'step_figures', rawFilters.step_figures);

  if (['all', 'any', 'exact'].includes(rawFilters.step_figures_match_mode)) {
    normalized.step_figures_match_mode = rawFilters.step_figures_match_mode;
  }

  if (rawFilters.without_step_figures === true) {
    normalized.without_step_figures = true;
  }

  assignNonEmptyArray(normalized, 'required_step_figures', rawFilters.required_step_figures);

  const tags = normalizeStringArray(rawFilters.tags);
  if (tags.length > 0) normalized.tags = tags;

  const excludedTags = normalizeStringArray(rawFilters.excluded_tags).filter(
    (tag) => !tags.includes(tag),
  );
  if (excludedTags.length > 0) normalized.excluded_tags = excludedTags;

  assignNonEmptyArray(normalized, 'authors', rawFilters.authors);

  const parsedMaxCount = Number.parseInt(String(rawFilters.max_count), 10);
  if (!Number.isNaN(parsedMaxCount) && parsedMaxCount >= 0) {
    normalized.max_count = parsedMaxCount;
  }

  const parsedMinRating = Number.parseInt(String(rawFilters.min_rating), 10);
  if (!Number.isNaN(parsedMinRating) && parsedMinRating >= 0 && parsedMinRating <= 5) {
    normalized.min_rating = parsedMinRating;
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
       FROM personal_data.saved_filter_configurations
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

    const saved = await withTransaction('choreography', async () => {
      await runQuery(
        `INSERT INTO personal_data.saved_filter_configurations (name, filters_json)
       VALUES (?, ?)
       ON CONFLICT(name)
       DO UPDATE SET
         filters_json = excluded.filters_json,
         updated_at = CURRENT_TIMESTAMP`,
        [name, filtersJson],
      );

      return getQuery(
        `SELECT id, name, filters_json, created_at, updated_at
       FROM personal_data.saved_filter_configurations
       WHERE name = ?`,
        [name],
      );
    });

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

    const outcome = await withTransaction('choreography', async () => {
      const existing = await getQuery(
        `SELECT id, name, filters_json, created_at, updated_at
       FROM personal_data.saved_filter_configurations
       WHERE id = ?`,
        [configurationId],
      );

      if (!existing) {
        return { status: 404, error: 'Saved filter configuration not found' };
      }

      const hasNameUpdate = Object.hasOwn(req.body || {}, 'name');
      const hasFiltersUpdate = Object.hasOwn(req.body || {}, 'filters');

      if (!hasNameUpdate && !hasFiltersUpdate) {
        return { status: 400, error: 'Nothing to update' };
      }

      let nextName = existing.name;
      if (hasNameUpdate) {
        const rawName = req.body?.name;
        const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
        if (!trimmedName) {
          return { status: 400, error: 'Configuration name is required' };
        }
        nextName = trimmedName;
      }

      const nextFilters = hasFiltersUpdate
        ? normalizeSavedFilters(req.body?.filters || {})
        : parseStoredFilters(existing.filters_json);

      await runQuery(
        `UPDATE personal_data.saved_filter_configurations
       SET name = ?, filters_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [nextName, JSON.stringify(nextFilters), configurationId],
      );

      const updated = await getQuery(
        `SELECT id, name, filters_json, created_at, updated_at
       FROM personal_data.saved_filter_configurations
       WHERE id = ?`,
        [configurationId],
      );

      return { updated };
    });

    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    const { updated } = outcome;
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

    const result = await runQuery(
      'DELETE FROM personal_data.saved_filter_configurations WHERE id = ?',
      [configurationId],
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved filter configuration not found' });
    }

    res.json({ message: 'Filter configuration deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
}
