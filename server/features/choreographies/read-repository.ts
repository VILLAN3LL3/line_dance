import { allQuery, getQuery } from '../../scripts/db.ts';
import { buildFilterConditions } from './search-query.ts';
import type { SearchFilters } from './search-query.ts';
import type { FigureRelation } from './search-operations.ts';
import type { DuplicateCriteria } from './read-operations.ts';
import type { ChoreographyReadId } from './read-validation.ts';
import { effectiveLevelValue, levelColumns, personalLevelJoins } from './level-sql.ts';

export type ChoreographyRow = {
  id: number;
  name: string;
  step_sheet_link: string | null;
  demo_video_url: string | null;
  tutorial_video_url: string | null;
  count: number | string | null;
  wall_count: number | string | null;
  level_id: number;
  creation_year: number | string | null;
  created_at: string | null;
  updated_at: string | null;
  level: string | null;
  official_level: string | null;
  personal_level: string | null;
};
export type InformationRow = { id: number; category: string; description: string };
export type DuplicateRow = { id: number; name: string; level: string };

export async function listChoreographies(
  limit: number,
  offset: number,
): Promise<ChoreographyRow[]> {
  return allQuery<ChoreographyRow>(
    `SELECT c.*, ${levelColumns} FROM choreographies c
     LEFT JOIN levels l ON c.level_id = l.id
     ${personalLevelJoins}
     ORDER BY LOWER(c.name) ASC, COALESCE(${effectiveLevelValue}, 2147483647) ASC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

export async function findChoreography(
  id: ChoreographyReadId,
): Promise<ChoreographyRow | undefined> {
  return getQuery<ChoreographyRow>(
    `SELECT c.*, ${levelColumns} FROM choreographies c
     LEFT JOIN levels l ON c.level_id = l.id
     ${personalLevelJoins}
     WHERE c.id = ?`,
    [id],
  );
}

export async function countChoreographies(): Promise<{ count: number } | undefined> {
  return getQuery<{ count: number }>('SELECT COUNT(*) as count FROM choreographies');
}

export async function findAuthors(id: number): Promise<{ name: string }[]> {
  return allQuery<{ name: string }>(
    `SELECT a.name FROM authors a
     INNER JOIN choreography_authors ca ON a.id = ca.author_id
     WHERE ca.choreography_id = ?`,
    [id],
  );
}

export async function findTags(id: number): Promise<{ name: string }[]> {
  return allQuery<{ name: string }>(
    `SELECT t.name FROM personal_data.tags t
     INNER JOIN personal_data.choreography_tags ct ON t.id = ct.tag_id
     WHERE ct.choreography_id = ?`,
    [id],
  );
}

export async function findStepFigures(id: number): Promise<{ name: string }[]> {
  return allQuery<{ name: string }>(
    `SELECT sf.name FROM step_figures sf
     INNER JOIN choreography_step_figures csf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id = ?`,
    [id],
  );
}

export async function findInformation(id: number): Promise<InformationRow[]> {
  return allQuery<InformationRow>(
    `SELECT info.id, category.name AS category, info.description
     FROM choreography_information info
     INNER JOIN choreography_info_categories category ON category.id = info.category_id
     WHERE info.choreography_id = ?
     ORDER BY info.id ASC`,
    [id],
  );
}

export async function findRating(id: number): Promise<{ rating: number } | undefined> {
  return getQuery<{ rating: number }>(
    'SELECT rating FROM personal_data.choreography_ratings WHERE choreography_id = ?',
    [id],
  );
}

export async function findDuplicates({
  name,
  level,
  excludeId,
  authors,
}: DuplicateCriteria): Promise<DuplicateRow[]> {
  const placeholders = authors.map(() => 'UPPER(?)').join(', ');
  const params = [name, level, ...(excludeId ? [excludeId] : []), ...authors];
  return allQuery<DuplicateRow>(
    `SELECT c.id, c.name, l.name AS level
     FROM choreographies c
     JOIN levels l ON c.level_id = l.id
     WHERE UPPER(c.name) = UPPER(?)
       AND UPPER(l.name) = UPPER(?)
       ${excludeId ? 'AND c.id != ?' : ''}
       AND c.id IN (
         SELECT ca.choreography_id
         FROM choreography_authors ca
         JOIN authors a ON a.id = ca.author_id
         WHERE UPPER(a.name) IN (${placeholders})
       )`,
    params,
  );
}

export async function listFigureRelations(): Promise<FigureRelation[]> {
  return allQuery<FigureRelation>(
    `SELECT parent.name AS parent_name, child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY parent.name ASC, child.name ASC`,
  );
}

export async function searchChoreographies(filters: SearchFilters): Promise<ChoreographyRow[]> {
  const { conditions, params, joins, stepFilter } = buildFilterConditions(filters);
  let query = `SELECT DISTINCT c.*, ${levelColumns} FROM choreographies c
     LEFT JOIN levels l ON c.level_id = l.id
     ${personalLevelJoins}`;
  query += joins.map((join) => ` ${join}`).join('');
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  if (stepFilter.groupBy) query += stepFilter.groupBy;
  if (stepFilter.having) query += stepFilter.having;
  query += ` ORDER BY LOWER(c.name) ASC, COALESCE(${effectiveLevelValue}, 2147483647) ASC`;
  return allQuery<ChoreographyRow>(query, [...params, ...stepFilter.havingParams]);
}
