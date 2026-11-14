import { getQuery } from '../scripts/db.ts';

const countryCache = new Map<string, string>();

/**
 * Extract country code from author name (format: "Name (CODE)")
 * Preserves null or undefined input and returns a nullable country code.
 */
export function parseAuthorName(fullName: string | null | undefined): {
  name: string | null | undefined;
  code: string | null;
} {
  if (!fullName) {
    return { name: fullName, code: null };
  }

  const match = fullName.match(/^(.+?)\s*\(([A-Z]{2})\)$/); // NOSONAR -- preserve legacy name matching
  if (match) {
    return { name: match[1].trim(), code: match[2] };
  }

  return { name: fullName, code: null };
}

/**
 * Get country name from ISO 2-char code
 */
export async function getCountryNameByCode(
  code: string | null | undefined,
): Promise<string | null> {
  if (!code) {
    return null;
  }

  // Check cache first
  const cached = countryCache.get(code);
  if (cached !== undefined) return cached;

  try {
    const result = await getQuery<{ name: string }>(
      'SELECT name FROM countries WHERE iso_2_code = ? LIMIT 1',
      [code],
      'choreography',
    );

    if (result) {
      countryCache.set(code, result.name);
      return result.name;
    }
  } catch (error) {
    // Table might not exist yet or other DB error
    let message: unknown;
    if (
      error !== null &&
      (typeof error === 'object' || typeof error === 'function') &&
      'message' in error
    ) {
      message = error.message;
    }
    console.error(`Error fetching country name for code ${code}:`, message);
  }

  return null;
}

/**
 * Format author name with country name instead of code
 * Input: "Bettina Haag (DE)"
 * Output: "Bettina Haag (Germany)"
 */
export function formatAuthorWithCountryName(fullName: string): Promise<string>;
export function formatAuthorWithCountryName<T extends null | undefined>(fullName: T): Promise<T>;
export function formatAuthorWithCountryName(
  fullName: string | null | undefined,
): Promise<string | null | undefined>;
export async function formatAuthorWithCountryName(
  fullName: string | null | undefined,
): Promise<string | null | undefined> {
  const { name, code } = parseAuthorName(fullName);

  if (!code) {
    return fullName;
  }

  const countryName = await getCountryNameByCode(code);

  if (countryName) {
    return `${name} (${countryName})`;
  }

  // If country not found, return original
  return fullName;
}

/**
 * Format multiple author names
 */
export function formatAuthorsWithCountryNames(authorNames: string[]): Promise<string[]>;
export function formatAuthorsWithCountryNames(
  authorNames: (string | null | undefined)[],
): Promise<(string | null | undefined)[]>;
export function formatAuthorsWithCountryNames<T>(
  authorNames: T extends readonly unknown[] ? never : T,
): Promise<T>;
export async function formatAuthorsWithCountryNames<T>(
  authorNames: T | (string | null | undefined)[],
): Promise<T | (string | null | undefined)[]> {
  if (!Array.isArray(authorNames)) {
    return authorNames;
  }

  return Promise.all(
    authorNames.map((name: string | null | undefined) => formatAuthorWithCountryName(name)),
  );
}

/**
 * Clear the country cache (useful for testing)
 */
export function clearCountryCache(): void {
  countryCache.clear();
}
