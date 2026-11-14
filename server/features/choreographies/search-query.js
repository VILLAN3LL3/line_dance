import { normalizeNonNegativeInteger } from '../../utils/choreographyNormalization.ts';
import {
  normalizeMatchMode,
  normalizeNumericQueryParam,
  normalizeQueryParam,
  normalizeSearchText,
  normalizeUniqueTextQueryParam,
} from './search-operations.js';

export function buildFilterConditions(filterObj) {
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
