import { z } from 'zod';

const stringConversion = z.preprocess(String, z.string());

export function normalizeNonNegativeInteger(value: unknown): number | null {
  const parsed = Number.parseInt(stringConversion.parse(value), 10);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

export function normalizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim());
}

export function normalizeStringField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<number>();
  const ids: number[] = [];
  for (const entry of value) {
    const parsed = Number.parseInt(stringConversion.parse(entry), 10);
    if (Number.isNaN(parsed) || parsed <= 0 || seenIds.has(parsed)) continue;
    seenIds.add(parsed);
    ids.push(parsed);
  }
  return ids;
}
