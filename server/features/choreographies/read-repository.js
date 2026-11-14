import { allQuery, getQuery } from '../../scripts/db.js';
import { buildFilterConditions } from './search-query.js';

export function listChoreographies(limit, offset) {
  return allQuery(
    `SELECT c.*, l.name as level FROM choreographies c
     LEFT JOIN levels l ON c.level_id = l.id
     ORDER BY LOWER(c.name) ASC, COALESCE(l.value, 2147483647) ASC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

export function findChoreography(id) {
  return getQuery(
    'SELECT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id WHERE c.id = ?',
    [id],
  );
}

export function countChoreographies() {
  return getQuery('SELECT COUNT(*) as count FROM choreographies');
}

export function findAuthors(id) {
  return allQuery(
    `SELECT a.name FROM authors a
     INNER JOIN choreography_authors ca ON a.id = ca.author_id
     WHERE ca.choreography_id = ?`,
    [id],
  );
}

export function findTags(id) {
  return allQuery(
    `SELECT t.name FROM personal_data.tags t
     INNER JOIN personal_data.choreography_tags ct ON t.id = ct.tag_id
     WHERE ct.choreography_id = ?`,
    [id],
  );
}

export function findStepFigures(id) {
  return allQuery(
    `SELECT sf.name FROM step_figures sf
     INNER JOIN choreography_step_figures csf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id = ?`,
    [id],
  );
}

export function findInformation(id) {
  return allQuery(
    `SELECT info.id, category.name AS category, info.description
     FROM choreography_information info
     INNER JOIN choreography_info_categories category ON category.id = info.category_id
     WHERE info.choreography_id = ?
     ORDER BY info.id ASC`,
    [id],
  );
}

export function findRating(id) {
  return getQuery(
    'SELECT rating FROM personal_data.choreography_ratings WHERE choreography_id = ?',
    [id],
  );
}

export function findDuplicates({ name, level, excludeId, authors }) {
  const placeholders = authors.map(() => 'UPPER(?)').join(', ');
  const params = [name, level, ...(excludeId ? [excludeId] : []), ...authors];
  return allQuery(
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

export function listFigureRelations() {
  return allQuery(
    `SELECT parent.name AS parent_name, child.name AS child_name
     FROM step_figure_components sfc
     INNER JOIN step_figures parent ON parent.id = sfc.parent_step_figure_id
     INNER JOIN step_figures child ON child.id = sfc.child_step_figure_id
     ORDER BY parent.name ASC, child.name ASC`,
  );
}

export function searchChoreographies(filters) {
  const { conditions, params, joins, stepFilter } = buildFilterConditions(filters);
  let query =
    'SELECT DISTINCT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
  query += joins.map((join) => ` ${join}`).join('');
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  if (stepFilter.groupBy) query += stepFilter.groupBy;
  if (stepFilter.having) query += stepFilter.having;
  query += ' ORDER BY LOWER(c.name) ASC, COALESCE(l.value, 2147483647) ASC';
  return allQuery(query, [...params, ...stepFilter.havingParams]);
}
