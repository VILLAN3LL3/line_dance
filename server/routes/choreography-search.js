import { allQuery } from '../scripts/db.js';
import { captureError, enrichChoreography } from './choreography-shared.js';
import {
  buildFilterConditions,
  normalizeMatchMode,
  expandStepFigureNamesWithHierarchy,
  expandStepFigureNamesForExactMode,
} from './choreography-search-filters.js';

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
