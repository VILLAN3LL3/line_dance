import { z } from 'zod';

const levelNameSchema = z.string().trim().min(1).brand<'LevelName'>();
const levelBodySchema = z.object({ name: z.unknown().optional(), value: z.unknown().optional() });
const stringConversion = z.preprocess(String, z.string());

type LevelName = z.output<typeof levelNameSchema>;
type LevelValue = { value: number | null } | { error: 'invalid_value' };
export type LevelInput =
  | { error: 'name_required' }
  | {
      value: {
        name: LevelName;
        levelValue: LevelValue | { exception: TypeError | RangeError };
      };
    };
export type AuthorCount = {
  author_name: string;
  level_name: string | null;
  count: number | string;
};
export type AuthorStatistics = { name: string; total: number; by_level: Record<string, number> };
export type Country = { iso_2_code: string; iso_3_code: string; name: string };
export type CountryAlias = { alias: string; name: string };

export function validateLevelName(
  input: unknown,
): { error: 'name_required' } | { value: LevelName } {
  if (input === null || input === undefined) throw new TypeError('Level input is missing');
  const body = levelBodySchema.safeParse(input);
  if (!body.success || body.data.name == null) return { error: 'name_required' };
  if (typeof body.data.name !== 'string') throw new TypeError('Level name must be a string');
  const name = levelNameSchema.safeParse(body.data.name);
  return name.success ? { value: name.data } : { error: 'name_required' };
}

export function validateLevelValue(raw: unknown): LevelValue {
  if (raw === undefined || raw === null || stringConversion.parse(raw).trim() === '')
    return { value: null };
  const value = Number.parseInt(stringConversion.parse(raw), 10);
  return Number.isNaN(value) ? { error: 'invalid_value' } : { value };
}

export function prepareLevel(input: unknown): LevelInput {
  const name = validateLevelName(input);
  if ('error' in name) return name;
  const body = levelBodySchema.parse(input);
  try {
    return { value: { name: name.value, levelValue: validateLevelValue(body.value) } };
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error;
    return { value: { name: name.value, levelValue: { exception: error } } };
  }
}

export function nextLevelValue(maxValue: number | string | null | undefined): number {
  return Number(maxValue || 0) + 10;
}

export function authorStatistics(rows: AuthorCount[]): AuthorStatistics[] {
  const authors = new Map<string, AuthorStatistics>();
  for (const row of rows) {
    const author = authors.get(row.author_name) ?? {
      name: row.author_name,
      total: 0,
      by_level: {},
    };
    authors.set(row.author_name, author);
    const count = Number(row.count);
    author.total += count;
    if (row.level_name) author.by_level[row.level_name] = count;
  }
  return [...authors.values()];
}

export function countryCodeMap(
  countries: Country[],
  aliases: CountryAlias[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const country of countries) {
    result[country.iso_2_code] = country.name;
    result[country.iso_3_code] = country.name;
  }
  for (const alias of aliases) result[alias.alias] = alias.name;
  return result;
}
