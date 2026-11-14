import { allQuery } from '../scripts/db.js';
import {
  captureError,
  enrichChoreography,
  normalizeNonNegativeInteger,
} from './choreography-shared.js';

function buildFilterConditions(filterObj) {
  const {
    search,
    song_artist,
    level,
    max_level_value,
    step_figures,
    step_figures_match_mode,
    without_step_figures,
    required_step_figures,
    tags,
    excluded_tags,
    authors,
    min_rating,
  } = filterObj;
  const conditions = [];
  const params = [];
  const joins = [];

  if (search) {
    // Normalize smart/curly apostrophes in both source and query for consistent title matching.
    conditions.push(
      "LOWER(REPLACE(REPLACE(c.name, char(8217), ''''), char(8216), '''')) LIKE LOWER(?)",
    );
    params.push(`%${normalizeSearchText(search)}%`);
  }

  if (song_artist) {
    // Search for song or artist (case-insensitive, partial match)
    conditions.push('(LOWER(c.song) LIKE LOWER(?) OR LOWER(c.artist) LIKE LOWER(?))');
    const searchTerm = `%${song_artist}%`;
    params.push(searchTerm, searchTerm);
  }

  const levelFilter = buildLevelFilter(level, max_level_value);
  if (levelFilter.condition) {
    conditions.push(levelFilter.condition);
    params.push(...levelFilter.params);
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
    'personal_data.choreography_tags',
    'tag_id',
    'personal_data.tags',
  );
  joins.push(...tagsFilter.joins);
  conditions.push(...tagsFilter.conditions);
  params.push(...tagsFilter.params);

  const excludedTagsFilter = buildExcludedRelationshipFilter(
    excluded_tags,
    'personal_data.choreography_tags',
    'tag_id',
    'personal_data.tags',
  );
  conditions.push(...excludedTagsFilter.conditions);
  params.push(...excludedTagsFilter.params);

  const authorsFilter = buildRelationshipFilter(
    authors,
    'choreography_authors',
    'author_id',
    'authors',
  );
  joins.push(...authorsFilter.joins);
  conditions.push(...authorsFilter.conditions);
  params.push(...authorsFilter.params);

  const parsedMinRating = normalizeNonNegativeInteger(min_rating);
  if (parsedMinRating !== null && parsedMinRating >= 0 && parsedMinRating <= 5) {
    joins.push('LEFT JOIN personal_data.choreography_ratings cr ON c.id = cr.choreography_id');
    conditions.push('COALESCE(cr.rating, 0) >= ?');
    params.push(parsedMinRating);
  }

  const requiredFigures = normalizeUniqueTextQueryParam(required_step_figures);
  for (const figure of requiredFigures) {
    conditions.push(
      `EXISTS (SELECT 1 FROM choreography_step_figures req_csf
               INNER JOIN step_figures req_sf ON req_csf.step_figure_id = req_sf.id
               WHERE req_csf.choreography_id = c.id AND LOWER(req_sf.name) = LOWER(?))`,
    );
    params.push(figure);
  }

  return { conditions, params, joins, stepFilter };
}

export async function searchChoreographies(req, res) {
  try {
    const {
      level,
      max_level_value,
      step_figures,
      step_figures_match_mode,
      without_step_figures,
      required_step_figures,
      tags,
      excluded_tags,
      authors,
      search,
      song_artist,
      min_rating,
    } = req.query;

    const matchMode = normalizeMatchMode(step_figures_match_mode);
    const expandedStepFigures =
      matchMode === 'exact'
        ? await expandStepFigureNamesForExactMode(step_figures)
        : await expandStepFigureNamesWithHierarchy(step_figures);

    const { conditions, params, joins, stepFilter } = buildFilterConditions({
      search,
      song_artist,
      level,
      max_level_value,
      step_figures: expandedStepFigures,
      step_figures_match_mode,
      without_step_figures,
      required_step_figures,
      tags,
      excluded_tags,
      authors,
      min_rating,
    });

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

    query += ' ORDER BY LOWER(c.name) ASC, COALESCE(l.value, 2147483647) ASC';

    const choreographies = await allQuery(query, params);
    const enriched = await Promise.all(choreographies.map((c) => enrichChoreography(c)));
    const total = enriched.length;

    res.json({
      data: enriched,
      pagination: {
        page: 1,
        limit: total,
        total,
        totalPages: total > 0 ? 1 : 0,
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

function normalizeUniqueTextQueryParam(param) {
  const normalizedItems = [];
  const seen = new Set();

  for (const value of normalizeQueryParam(param)) {
    const trimmed = String(value).trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedItems.push(trimmed);
  }

  return normalizedItems;
}

function normalizeNumericQueryParam(param) {
  const values = normalizeQueryParam(param);

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const parsed = normalizeNonNegativeInteger(values[index]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
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
    .replaceAll(/\s+/g, ' ');

  // Support users typing quoted titles, e.g. "Bohemian Rhapsody".
  const wrappedInSameQuote =
    normalized.length >= 2 &&
    ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")));

  return wrappedInSameQuote ? normalized.slice(1, -1).trim() : normalized;
}

async function expandStepFigureNamesWithHierarchy(stepFigureParam) {
  const requestedNames = normalizeUniqueTextQueryParam(stepFigureParam);

  if (requestedNames.length === 0) {
    return [];
  }

  const relations = await allQuery(
    `SELECT parent.name AS parent_name, child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY parent.name ASC, child.name ASC`,
  );

  const childrenByParent = new Map();
  for (const relation of relations) {
    if (!childrenByParent.has(relation.parent_name)) {
      childrenByParent.set(relation.parent_name, new Set());
    }
    childrenByParent.get(relation.parent_name).add(relation.child_name);
  }

  const expanded = new Set(requestedNames);
  const expandedLower = new Set(requestedNames.map((name) => name.toLowerCase()));
  let changed = true;

  while (changed) {
    changed = false;

    for (const [parentName, children] of childrenByParent.entries()) {
      if (expandedLower.has(parentName.toLowerCase())) {
        continue;
      }

      const matchingChildCount = Array.from(children).filter((childName) =>
        expandedLower.has(childName.toLowerCase()),
      ).length;

      if (matchingChildCount > 1) {
        expanded.add(parentName);
        expandedLower.add(parentName.toLowerCase());
        changed = true;
      }
    }
  }

  return Array.from(expanded);
}

async function expandStepFigureNamesForExactMode(stepFigureParam) {
  const requestedNames = normalizeUniqueTextQueryParam(stepFigureParam);

  if (requestedNames.length === 0) {
    return [];
  }

  const relations = await allQuery(
    `SELECT parent.name AS parent_name, child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY parent.name ASC, child.name ASC`,
  );

  const requiredChildrenByParent = new Map();
  for (const relation of relations) {
    if (!requiredChildrenByParent.has(relation.parent_name)) {
      requiredChildrenByParent.set(relation.parent_name, new Set());
    }
    requiredChildrenByParent.get(relation.parent_name).add(relation.child_name);
  }

  const expanded = new Set(requestedNames);
  const expandedLower = new Set(requestedNames.map((name) => name.toLowerCase()));
  let changed = true;

  while (changed) {
    changed = false;

    for (const [parentName, requiredChildren] of requiredChildrenByParent.entries()) {
      if (expandedLower.has(parentName.toLowerCase())) {
        continue;
      }

      const matchingChildren = Array.from(requiredChildren).filter((childName) =>
        expandedLower.has(childName.toLowerCase()),
      );
      const hasAllChildren = matchingChildren.length === requiredChildren.size;

      if (hasAllChildren && matchingChildren.length > 1) {
        expanded.add(parentName);
        expandedLower.add(parentName.toLowerCase());
        changed = true;
      }
    }
  }

  return Array.from(expanded);
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
    const figures = normalizeUniqueTextQueryParam(step_figures);
    if (figures.length > 0) {
      if (matchMode === 'exact') {
        result.joins = [
          'LEFT JOIN choreography_step_figures csf_all ON c.id = csf_all.choreography_id',
          'LEFT JOIN step_figures sf_all ON csf_all.step_figure_id = sf_all.id',
        ];
        result.groupBy = ' GROUP BY c.id';
        result.having = ` HAVING COUNT(DISTINCT sf_all.id) > 0 AND COUNT(DISTINCT CASE WHEN LOWER(sf_all.name) IN (${figures.map(() => 'LOWER(?)').join(',')}) THEN sf_all.id END) = COUNT(DISTINCT sf_all.id)`;
        result.havingParams = figures;
      } else {
        result.joins = [
          'INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id',
          'INNER JOIN step_figures sf ON csf.step_figure_id = sf.id',
        ];
        result.conditions = [`LOWER(sf.name) IN (${figures.map(() => 'LOWER(?)').join(',')})`];
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

function buildLevelFilter(level, max_level_value) {
  const levelList = normalizeQueryParam(level)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const maxLevelValue = normalizeNumericQueryParam(max_level_value);

  if (levelList.length === 0 && maxLevelValue === null) {
    return { condition: '', params: [] };
  }

  const parts = [];
  const params = [];

  if (levelList.length > 0) {
    const placeholders = levelList.map(() => 'UPPER(?)').join(',');
    parts.push(`UPPER(l.name) IN (${placeholders})`);
    params.push(...levelList);
  }

  if (maxLevelValue !== null) {
    parts.push('(l.value IS NOT NULL AND l.value <= ?)');
    params.push(maxLevelValue);
  }

  return {
    condition: parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`,
    params,
  };
}

function buildRelationshipFilter(items, relationshipTable, relationshipPkCol, entityTable) {
  const result = { joins: [], conditions: [], params: [] };
  const itemList = normalizeUniqueTextQueryParam(items);
  if (itemList.length > 0) {
    result.joins = [
      `INNER JOIN ${relationshipTable} ON c.id = ${relationshipTable}.choreography_id`,
      `INNER JOIN ${entityTable} ON ${relationshipTable}.${relationshipPkCol} = ${entityTable}.id`,
    ];
    result.conditions = [
      `LOWER(${entityTable}.name) IN (${itemList.map(() => 'LOWER(?)').join(',')})`,
    ];
    result.params = itemList;
  }
  return result;
}

function buildExcludedRelationshipFilter(items, relationshipTable, relationshipPkCol, entityTable) {
  const result = { conditions: [], params: [] };
  const itemList = normalizeUniqueTextQueryParam(items);

  if (itemList.length > 0) {
    result.conditions = [
      `NOT EXISTS (SELECT 1 FROM ${relationshipTable} excluded_rel INNER JOIN ${entityTable} excluded_entity ON excluded_rel.${relationshipPkCol} = excluded_entity.id WHERE excluded_rel.choreography_id = c.id AND LOWER(excluded_entity.name) IN (${itemList.map(() => 'LOWER(?)').join(',')}))`,
    ];
    result.params = itemList;
  }

  return result;
}

// Helper functions
