import { allQuery, getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { AuthorCount, Country, CountryAlias } from './operations.ts';
import { effectiveLevelName, personalLevelJoins } from '../choreographies/level-sql.ts';

export type Level = { id: number; name: string; value: number | null };

export async function withMetadataTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function listLevels(): Promise<Level[]> {
  return allQuery<Level>('SELECT id, name, value FROM levels ORDER BY value ASC, LOWER(name) ASC');
}

export async function listTags(): Promise<{ name: string }[]> {
  return allQuery<{ name: string }>('SELECT name FROM personal_data.tags ORDER BY name');
}

export async function listInformationCategories(): Promise<{ name: string }[]> {
  return allQuery<{ name: string }>(
    'SELECT name FROM choreography_info_categories ORDER BY is_seeded DESC, id ASC',
  );
}

export async function listAuthors(): Promise<{ name: string }[]> {
  return allQuery<{ name: string }>('SELECT name FROM authors ORDER BY name');
}

export async function listAuthorCounts(): Promise<AuthorCount[]> {
  return allQuery<AuthorCount>(
    `SELECT a.name AS author_name, ${effectiveLevelName} AS level_name, COUNT(DISTINCT ca.choreography_id) AS count
     FROM authors a
     JOIN choreography_authors ca ON a.id = ca.author_id
     JOIN choreographies c ON ca.choreography_id = c.id
     LEFT JOIN levels l ON c.level_id = l.id
     ${personalLevelJoins}
     GROUP BY a.id, ${effectiveLevelName}
     ORDER BY a.name ASC, ${effectiveLevelName} ASC`,
  );
}

export async function findLevelByName(name: string): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [name]);
}

export async function findMaxLevelValue(): Promise<{ max_value: number } | undefined> {
  return getQuery<{ max_value: number }>('SELECT COALESCE(MAX(value), 0) AS max_value FROM levels');
}

export async function insertLevel(
  name: string,
  value: number,
): Promise<{ id: number } | { error: 'duplicate_level' }> {
  try {
    const result = await runQuery('INSERT INTO levels (name, value) VALUES (?, ?)', [name, value]);
    return { id: result.id };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'SQLITE_CONSTRAINT' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('UNIQUE constraint failed: levels.name')
    ) {
      return { error: 'duplicate_level' };
    }
    throw error;
  }
}

export async function findMaxChoreographyCount(): Promise<
  { max_count: number | null } | undefined
> {
  return getQuery<{ max_count: number | null }>(
    'SELECT MAX(count) as max_count FROM choreographies WHERE count IS NOT NULL',
  );
}

export async function listCountries(): Promise<Country[]> {
  return allQuery<Country>(
    'SELECT iso_2_code, iso_3_code, name FROM countries ORDER BY iso_2_code',
  );
}

export async function listCountryAliases(): Promise<CountryAlias[]> {
  return allQuery<CountryAlias>(
    `SELECT a.alias, c.name FROM country_code_aliases a
     JOIN countries c ON a.country_id = c.id`,
  );
}
