import { describe, it, expect } from 'vitest';
import { parseAuthorName } from '../../utils/countryUtils.js';

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
      const result1 = parseAuthorName('Author (D)');  // Too short
      const result2 = parseAuthorName('Author (DEU)');  // Too long
      
      expect(result1.code).toBeNull();
      expect(result2.code).toBeNull();
    });
  });
});
