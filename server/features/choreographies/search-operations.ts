import { z } from 'zod';
import { normalizeNonNegativeInteger } from '../../utils/choreographyNormalization.ts';
import type { JsonValue } from '../../utils/json-input.ts';

export type QueryValue = JsonValue | undefined;
export type FigureRelation = { parent_name: string; child_name: string };
export type MatchMode = 'all' | 'any' | 'exact';

const stringConversion = z.preprocess(String, z.string());

export function stringifyQueryValue(value: QueryValue): string {
  return stringConversion.parse(value);
}

export function normalizeQueryParam(param: QueryValue): JsonValue[] {
  if (Array.isArray(param)) return param;
  if (param && typeof param === 'object') {
    return Object.values(param)
      .filter((value) => value !== undefined && value !== null)
      .map(String);
  }
  return param ? [param] : [];
}

export function normalizeUniqueTextQueryParam(param: QueryValue): string[] {
  const normalizedItems: string[] = [];
  const seen = new Set<string>();
  for (const value of normalizeQueryParam(param)) {
    const trimmed = stringifyQueryValue(value).trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalizedItems.push(trimmed);
  }
  return normalizedItems;
}

export function normalizeNumericQueryParam(param: QueryValue): number | null {
  const values = normalizeQueryParam(param);
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const parsed = normalizeNonNegativeInteger(values[index]);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function normalizeMatchMode(rawMode: QueryValue): MatchMode {
  const modeValue = Array.isArray(rawMode) ? rawMode.at(-1) : rawMode;
  if (typeof modeValue !== 'string') return 'all';
  const normalized = modeValue.trim().toLowerCase();
  return normalized === 'any' || normalized === 'exact' ? normalized : 'all';
}

export function normalizeSearchText(rawText: QueryValue): string {
  if (typeof rawText !== 'string') return '';
  const normalized = rawText
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    .trim()
    .replaceAll(/\s+/g, ' ');
  const wrappedInSameQuote =
    normalized.length >= 2 &&
    ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")));
  return wrappedInSameQuote ? normalized.slice(1, -1).trim() : normalized;
}

export function expandStepFigureNames(
  stepFigureParam: QueryValue,
  relations: FigureRelation[],
  requireAllChildren: boolean,
): string[] {
  const requestedNames = normalizeUniqueTextQueryParam(stepFigureParam);
  if (requestedNames.length === 0) return [];

  const childrenByParent = new Map<string, Set<string>>();
  for (const relation of relations) {
    const children = childrenByParent.get(relation.parent_name) ?? new Set<string>();
    children.add(relation.child_name);
    childrenByParent.set(relation.parent_name, children);
  }

  const expanded = new Set(requestedNames);
  const expandedLower = new Set(requestedNames.map((name) => name.toLowerCase()));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [parentName, children] of childrenByParent.entries()) {
      if (expandedLower.has(parentName.toLowerCase())) continue;
      const matchingChildCount = Array.from(children).filter((childName) =>
        expandedLower.has(childName.toLowerCase()),
      ).length;
      if (matchingChildCount > 1 && (!requireAllChildren || matchingChildCount === children.size)) {
        expanded.add(parentName);
        expandedLower.add(parentName.toLowerCase());
        changed = true;
      }
    }
  }
  return Array.from(expanded);
}
