import {
  authorStatistics,
  countryCodeMap,
  nextLevelValue,
  validateLevelName,
  validateLevelValue,
} from './operations.js';
import * as metadata from './repository.js';

export function getLevels() {
  return metadata.listLevels();
}

export async function getTags() {
  return (await metadata.listTags()).map((row) => row.name);
}

export async function getInformationCategories() {
  return (await metadata.listInformationCategories()).map((row) => row.name);
}

export async function getAuthors() {
  return (await metadata.listAuthors()).map((row) => row.name);
}

export async function getAuthorStats() {
  return authorStatistics(await metadata.listAuthorCounts());
}

export async function addLevel(input) {
  const name = validateLevelName(input);
  if (name.error) return name;
  return metadata.withMetadataTransaction(async () => {
    if (await metadata.findLevelByName(name.value)) return { error: 'duplicate_level' };
    const parsed = validateLevelValue(input.value);
    if (parsed.error) return parsed;
    const value =
      parsed.value === null
        ? nextLevelValue((await metadata.findMaxLevelValue())?.max_value)
        : parsed.value;
    const result = await metadata.insertLevel(name.value, value);
    if (result.error) return result;
    return { value: { id: result.id, name: name.value, value } };
  });
}

export async function getMaxChoreographyCount() {
  const row = await metadata.findMaxChoreographyCount();
  return { max_count: row?.max_count || 0 };
}

export async function getCountryCodes() {
  const countries = await metadata.listCountries();
  const aliases = await metadata.listCountryAliases();
  return countryCodeMap(countries, aliases);
}
