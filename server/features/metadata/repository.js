import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';

export function withMetadataTransaction(action) {
  return withTransaction('choreography', action);
}

export function listLevels() {
  return allQuery('SELECT id, name, value FROM levels ORDER BY value ASC, LOWER(name) ASC');
}

export function listTags() {
  return allQuery('SELECT name FROM personal_data.tags ORDER BY name');
}

export function listInformationCategories() {
  return allQuery('SELECT name FROM choreography_info_categories ORDER BY is_seeded DESC, id ASC');
}

export function listAuthors() {
  return allQuery('SELECT name FROM authors ORDER BY name');
}

export function listAuthorCounts() {
  return allQuery(
    `SELECT a.name AS author_name, l.name AS level_name, COUNT(DISTINCT ca.choreography_id) AS count
     FROM authors a
     JOIN choreography_authors ca ON a.id = ca.author_id
     JOIN choreographies c ON ca.choreography_id = c.id
     LEFT JOIN levels l ON c.level_id = l.id
     GROUP BY a.id, l.id
     ORDER BY a.name ASC, l.name ASC`,
  );
}

export function findLevelByName(name) {
  return getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [name]);
}

export function findMaxLevelValue() {
  return getQuery('SELECT COALESCE(MAX(value), 0) AS max_value FROM levels');
}

export async function insertLevel(name, value) {
  try {
    const result = await runQuery('INSERT INTO levels (name, value) VALUES (?, ?)', [name, value]);
    return { id: result.id };
  } catch (error) {
    if (
      error?.code === 'SQLITE_CONSTRAINT' &&
      error.message?.includes('UNIQUE constraint failed: levels.name')
    ) {
      return { error: 'duplicate_level' };
    }
    throw error;
  }
}

export function findMaxChoreographyCount() {
  return getQuery('SELECT MAX(count) as max_count FROM choreographies WHERE count IS NOT NULL');
}

export function listCountries() {
  return allQuery('SELECT iso_2_code, iso_3_code, name FROM countries ORDER BY iso_2_code');
}

export function listCountryAliases() {
  return allQuery(
    `SELECT a.alias, c.name FROM country_code_aliases a
     JOIN countries c ON a.country_id = c.id`,
  );
}
