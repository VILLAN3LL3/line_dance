import { authorStatistics, countryCodeMap, nextLevelValue } from './operations.ts';
import type { AuthorStatistics, LevelInput } from './operations.ts';
import * as metadata from './repository.ts';
import type { Level } from './repository.ts';

type LevelRequest = LevelInput | { exception: TypeError | RangeError };
type AddLevelResult =
  | { error: 'name_required' | 'duplicate_level' | 'invalid_value' }
  | { value: { id: number; name: string; value: number } };

export async function getLevels(): Promise<Level[]> {
  return metadata.listLevels();
}

export async function getTags(): Promise<string[]> {
  return (await metadata.listTags()).map((row) => row.name);
}

export async function getInformationCategories(): Promise<string[]> {
  return (await metadata.listInformationCategories()).map((row) => row.name);
}

export async function getAuthors(): Promise<string[]> {
  return (await metadata.listAuthors()).map((row) => row.name);
}

export async function getAuthorStats(): Promise<AuthorStatistics[]> {
  return authorStatistics(await metadata.listAuthorCounts());
}

export async function addLevel(input: LevelRequest): Promise<AddLevelResult> {
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  const { name, levelValue } = input.value;
  return metadata.withMetadataTransaction(async () => {
    if (await metadata.findLevelByName(name)) return { error: 'duplicate_level' };
    if ('exception' in levelValue) throw levelValue.exception;
    if ('error' in levelValue) return levelValue;
    const value =
      levelValue.value ?? nextLevelValue((await metadata.findMaxLevelValue())?.max_value);
    const result = await metadata.insertLevel(name, value);
    if ('error' in result) return result;
    return { value: { id: result.id, name, value } };
  });
}

export async function getMaxChoreographyCount(): Promise<{ max_count: number }> {
  const row = await metadata.findMaxChoreographyCount();
  return { max_count: row?.max_count || 0 };
}

export async function getCountryCodes(): Promise<Record<string, string>> {
  const countries = await metadata.listCountries();
  const aliases = await metadata.listCountryAliases();
  return countryCodeMap(countries, aliases);
}
