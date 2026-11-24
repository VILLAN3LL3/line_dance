import { normalizeNonNegativeInteger } from '../../utils/choreographyNormalization.ts';
import {
  normalizeMatchMode,
  normalizeNumericQueryParam,
  normalizeQueryParam,
  normalizeSearchText,
  normalizeUniqueTextQueryParam,
  stringifyQueryValue,
} from './search-operations.ts';
import type { QueryValue } from './search-operations.ts';
import { effectiveLevelName, effectiveLevelValue } from './level-sql.ts';

export type SearchFilters = {
  search?: QueryValue;
  song_artist?: QueryValue;
  min_bpm?: QueryValue;
  max_bpm?: QueryValue;
  max_length_seconds?: QueryValue;
  genres?: QueryValue;
  level?: QueryValue;
  max_level_value?: QueryValue;
  step_figures?: QueryValue;
  step_figures_match_mode?: QueryValue;
  without_step_figures?: QueryValue;
  required_step_figures?: QueryValue;
  tags?: QueryValue;
  excluded_tags?: QueryValue;
  authors?: QueryValue;
  min_rating?: QueryValue;
  use_official_level?: QueryValue;
};
type QueryParameter = string | number;
type StepFilter = {
  joins: string[];
  conditions: string[];
  groupBy: string;
  having: string;
  havingParams: string[];
  params: string[];
};
type FilterConditions = {
  conditions: string[];
  params: QueryParameter[];
  joins: string[];
  stepFilter: StepFilter;
};

export function buildFilterConditions(filterObj: SearchFilters): FilterConditions {
  const {
    search,
    song_artist,
    min_bpm,
    max_bpm,
    max_length_seconds,
    genres,
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
    use_official_level,
  } = filterObj;
  const conditions: string[] = [];
  const params: QueryParameter[] = [];
  const joins: string[] = [];

  if (search) {
    // Normalize smart/curly apostrophes in both source and query for consistent title matching.
    conditions.push(
      "LOWER(REPLACE(REPLACE(c.name, char(8217), ''''), char(8216), '''')) LIKE LOWER(?)",
    );
    params.push(`%${normalizeSearchText(search)}%`);
  }

  if (song_artist) {
    // Search for the title or artist of any song (case-insensitive, partial match)
    conditions.push(`EXISTS (
      SELECT 1 FROM choreography_songs song
      WHERE song.choreography_id = c.id
        AND (LOWER(song.title) LIKE LOWER(?) OR LOWER(song.artist) LIKE LOWER(?))
    )`);
    const searchTerm = `%${stringifyQueryValue(song_artist)}%`;
    params.push(searchTerm, searchTerm);
  }

  const musicFilter = buildMusicFilter(min_bpm, max_bpm, max_length_seconds, genres);
  if (musicFilter.condition) {
    conditions.push(musicFilter.condition);
    params.push(...musicFilter.params);
  }

  const levelFilter = buildLevelFilter(
    level,
    max_level_value,
    use_official_level === 'true' || use_official_level === true,
  );
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

function buildStepFiguresFilter(
  step_figures: QueryValue | undefined,
  step_figures_match_mode: QueryValue | undefined,
  without_step_figures: QueryValue | undefined,
): StepFilter {
  const result: StepFilter = {
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

/** All criteria must hold for the same song; songs without a BPM or length never satisfy its bound. */
function buildMusicFilter(
  min_bpm: QueryValue | undefined,
  max_bpm: QueryValue | undefined,
  max_length_seconds: QueryValue | undefined,
  genres: QueryValue | undefined,
): { condition: string; params: QueryParameter[] } {
  const parts: string[] = [];
  const params: QueryParameter[] = [];
  const minBpm = normalizeNumericQueryParam(min_bpm);
  const maxBpm = normalizeNumericQueryParam(max_bpm);
  const maxLength = normalizeNumericQueryParam(max_length_seconds);
  const genreList = normalizeUniqueTextQueryParam(genres);

  if (minBpm !== null) {
    parts.push('music.bpm >= ?');
    params.push(minBpm);
  }
  if (maxBpm !== null) {
    parts.push('music.bpm <= ?');
    params.push(maxBpm);
  }
  if (maxLength !== null) {
    parts.push('music.length_seconds <= ?');
    params.push(maxLength);
  }
  if (genreList.length > 0) {
    parts.push(
      `music.genre_id IN (SELECT id FROM genres WHERE LOWER(name) IN (${genreList.map(() => 'LOWER(?)').join(',')}))`,
    );
    params.push(...genreList);
  }
  if (parts.length === 0) return { condition: '', params: [] };

  return {
    condition: `EXISTS (
      SELECT 1 FROM choreography_songs music
      WHERE music.choreography_id = c.id AND ${parts.join(' AND ')}
    )`,
    params,
  };
}

function buildLevelFilter(
  level: QueryValue | undefined,
  max_level_value: QueryValue | undefined,
  useOfficialLevel: boolean,
): { condition: string; params: QueryParameter[] } {
  // `l` is the official level; the effective level also considers the personal level.
  const levelName = useOfficialLevel ? 'l.name' : effectiveLevelName;
  const levelValue = useOfficialLevel ? 'l.value' : effectiveLevelValue;
  const levelList = normalizeQueryParam(level)
    .map((value) => stringifyQueryValue(value).trim())
    .filter(Boolean);
  const maxLevelValue = normalizeNumericQueryParam(max_level_value);

  if (levelList.length === 0 && maxLevelValue === null) {
    return { condition: '', params: [] };
  }

  const parts: string[] = [];
  const params: QueryParameter[] = [];

  if (levelList.length > 0) {
    const placeholders = levelList.map(() => 'UPPER(?)').join(',');
    parts.push(`UPPER(${levelName}) IN (${placeholders})`);
    params.push(...levelList);
  }

  if (maxLevelValue !== null) {
    parts.push(`(${levelValue} IS NOT NULL AND ${levelValue} <= ?)`);
    params.push(maxLevelValue);
  }

  return {
    condition: parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`,
    params,
  };
}

function buildRelationshipFilter(
  items: QueryValue | undefined,
  relationshipTable: string,
  relationshipPkCol: string,
  entityTable: string,
): { joins: string[]; conditions: string[]; params: string[] } {
  const result: { joins: string[]; conditions: string[]; params: string[] } = {
    joins: [],
    conditions: [],
    params: [],
  };
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

function buildExcludedRelationshipFilter(
  items: QueryValue | undefined,
  relationshipTable: string,
  relationshipPkCol: string,
  entityTable: string,
): { conditions: string[]; params: string[] } {
  const result: { conditions: string[]; params: string[] } = { conditions: [], params: [] };
  const itemList = normalizeUniqueTextQueryParam(items);

  if (itemList.length > 0) {
    result.conditions = [
      `NOT EXISTS (SELECT 1 FROM ${relationshipTable} excluded_rel INNER JOIN ${entityTable} excluded_entity ON excluded_rel.${relationshipPkCol} = excluded_entity.id WHERE excluded_rel.choreography_id = c.id AND LOWER(excluded_entity.name) IN (${itemList.map(() => 'LOWER(?)').join(',')}))`,
    ];
    result.params = itemList;
  }

  return result;
}
