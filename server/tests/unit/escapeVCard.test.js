import { describe, it, expect } from 'vitest';
import { escapeVCardValue } from '../../routes/dance-groups.js';

describe('escapeVCardValue', () => {
  it('leaves a plain ASCII string unchanged', () => {
    expect(escapeVCardValue('Jane Doe')).toBe('Jane Doe');
  });

  it('returns an empty string for null', () => {
    expect(escapeVCardValue(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(escapeVCardValue(undefined)).toBe('');
  });

  it('escapes a backslash as double-backslash', () => {
    expect(escapeVCardValue('C:\\path\\file')).toBe('C:\\\\path\\\\file');
  });

  it('escapes a semicolon', () => {
    expect(escapeVCardValue('a;b')).toBe('a\\;b');
  });

  it('escapes a comma', () => {
    expect(escapeVCardValue('a,b')).toBe('a\\,b');
  });

  it('escapes a newline as literal \\n', () => {
    expect(escapeVCardValue('line1\nline2')).toBe('line1\\nline2');
  });

  it('escapes multiple special characters in one string', () => {
    expect(escapeVCardValue('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });

  it('coerces a number to string before escaping', () => {
    expect(escapeVCardValue(42)).toBe('42');
  });

  it('coerces a boolean to string before escaping', () => {
    expect(escapeVCardValue(true)).toBe('true');
  });

  it('handles a string with only special characters', () => {
    expect(escapeVCardValue(';,\\\n')).toBe('\\;\\,\\\\\\n');
  });

  it('handles an email-style string with no escaping needed', () => {
    expect(escapeVCardValue('trainer@example.com')).toBe('trainer@example.com');
  });

  it('handles a phone number string', () => {
    expect(escapeVCardValue('+49 123 456 789')).toBe('+49 123 456 789');
  });
});
