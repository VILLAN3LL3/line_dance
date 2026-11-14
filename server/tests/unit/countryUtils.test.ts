import sqlite3 from 'sqlite3';
import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { closeDatabase, runQuery, setDatabaseConnection } from '../../scripts/db.ts';
import {
  clearCountryCache,
  formatAuthorsWithCountryNames,
  formatAuthorWithCountryName,
  getCountryNameByCode,
  parseAuthorName,
} from '../../utils/countryUtils.ts';

beforeAll(async () => {
  setDatabaseConnection('choreography', new sqlite3.Database(':memory:'));
  await runQuery('CREATE TABLE countries (iso_2_code TEXT PRIMARY KEY, name TEXT NOT NULL)');
  await runQuery("INSERT INTO countries VALUES ('DE', 'Germany')");
});

beforeEach(async () => {
  clearCountryCache();
  await runQuery("UPDATE countries SET name = 'Germany' WHERE iso_2_code = 'DE'");
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

describe('Country Utils', () => {
  describe('parseAuthorName', () => {
    it('should extract country code from author name', () => {
      const result = parseAuthorName('Bettina Haag (DE)');
      expect(result).toEqual({ name: 'Bettina Haag', code: 'DE' });
    });

    it('should handle multiple spaces before country code', () => {
      const result = parseAuthorName('John Doe    (CH)');
      expect(result).toEqual({ name: 'John Doe', code: 'CH' });
    });

    it('should return null code for names without country code', () => {
      const result = parseAuthorName('Single Name');
      expect(result).toEqual({ name: 'Single Name', code: null });
    });

    it('should return null code for lowercase country codes', () => {
      const result = parseAuthorName('Author (de)');
      expect(result).toEqual({ name: 'Author (de)', code: null });
    });

    it('should handle null input gracefully', () => {
      const result = parseAuthorName(null);
      expect(result).toEqual({ name: null, code: null });
    });

    it('should handle special characters in author name', () => {
      const result = parseAuthorName("Côte d'Ivoire Author (FR)");
      expect(result).toEqual({ name: "Côte d'Ivoire Author", code: 'FR' });
    });

    it('should handle country code at different positions', () => {
      const result1 = parseAuthorName('Mozart (AT)');
      const result2 = parseAuthorName('A B C D E (US)');

      expect(result1).toEqual({ name: 'Mozart', code: 'AT' });
      expect(result2).toEqual({ name: 'A B C D E', code: 'US' });
    });

    it('should not match codes without parentheses', () => {
      const result = parseAuthorName('Author DE');
      expect(result).toEqual({ name: 'Author DE', code: null });
    });

    it('should not match codes with lowercase or mixed case', () => {
      const result1 = parseAuthorName('Author (De)');
      const result2 = parseAuthorName('Author (de)');
      const result3 = parseAuthorName('Author (dE)');

      expect(result1.code).toBeNull();
      expect(result2.code).toBeNull();
      expect(result3.code).toBeNull();
    });

    it('should require exactly 2 uppercase letters', () => {
      const result1 = parseAuthorName('Author (D)'); // Too short
      const result2 = parseAuthorName('Author (DEU)'); // Too long

      expect(result1.code).toBeNull();
      expect(result2.code).toBeNull();
    });

    it('caches known country names and reloads them after clearing the cache', async () => {
      expect(await getCountryNameByCode('DE')).toBe('Germany');
      await runQuery("UPDATE countries SET name = 'Deutschland' WHERE iso_2_code = 'DE'");
      expect(await getCountryNameByCode('DE')).toBe('Germany');
      clearCountryCache();
      expect(await getCountryNameByCode('DE')).toBe('Deutschland');
      expect(await getCountryNameByCode('ZZ')).toBeNull();
      expect(await getCountryNameByCode('')).toBeNull();
    });

    it('formats known countries and preserves unknown or non-array inputs', async () => {
      expect(await formatAuthorsWithCountryNames(['Alice (DE)', 'Bob (ZZ)', 'Charlie'])).toEqual([
        'Alice (Germany)',
        'Bob (ZZ)',
        'Charlie',
      ]);
      expect(await formatAuthorsWithCountryNames(['Alice (DE)', null, undefined])).toEqual([
        'Alice (Germany)',
        null,
        undefined,
      ]);
      expect(await formatAuthorWithCountryName(null)).toBeNull();
      const input = { unexpected: true };
      expect(await formatAuthorsWithCountryNames(input)).toBe(input);
    });

    it('logs database lookup errors and retains the original author name', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      await runQuery('DROP TABLE countries');
      try {
        expect(await formatAuthorWithCountryName('Alice (DE)')).toBe('Alice (DE)');
        expect(log).toHaveBeenCalledWith(
          'Error fetching country name for code DE:',
          expect.stringContaining('no such table'),
        );
      } finally {
        await runQuery('CREATE TABLE countries (iso_2_code TEXT PRIMARY KEY, name TEXT NOT NULL)');
        await runQuery("INSERT INTO countries VALUES ('DE', 'Germany')");
      }
    });
  });
});
