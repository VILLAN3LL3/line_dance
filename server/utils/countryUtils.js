import { getQuery } from '../scripts/db.js';

const countryCache = new Map();

/**
 * Extract country code from author name (format: "Name (CODE)")
 * Returns { name: string, code: string | null }
 */
export function parseAuthorName(fullName) {
  if (!fullName) {
    return { name: fullName, code: null };
  }

  const match = fullName.match(/^(.+?)\s*\(([A-Z]{2})\)$/);
  if (match) {
    return { name: match[1].trim(), code: match[2] };
  }

  return { name: fullName, code: null };
}

/**
 * Get country name from ISO 2-char code
 */
export async function getCountryNameByCode(code) {
  if (!code) {
    return null;
  }

  // Check cache first
  if (countryCache.has(code)) {
    return countryCache.get(code);
  }

  try {
    const result = await getQuery(
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
    console.error(`Error fetching country name for code ${code}:`, error.message);
  }

  return null;
}

/**
 * Format author name with country name instead of code
 * Input: "Bettina Haag (DE)"
 * Output: "Bettina Haag (Germany)"
 */
export async function formatAuthorWithCountryName(fullName) {
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
export async function formatAuthorsWithCountryNames(authorNames) {
  if (!Array.isArray(authorNames)) {
    return authorNames;
  }

  return Promise.all(authorNames.map((name) => formatAuthorWithCountryName(name)));
}

/**
 * Clear the country cache (useful for testing)
 */
export function clearCountryCache() {
  countryCache.clear();
}
