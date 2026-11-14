import { normalizeNonNegativeInteger } from '../../utils/choreographyNormalization.js';

export function normalizeQueryParam(param) {
  if (Array.isArray(param)) return param;
  if (param && typeof param === 'object') {
    return Object.values(param)
      .filter((value) => value !== undefined && value !== null)
      .map(String);
  }
  return param ? [param] : [];
}

export function normalizeUniqueTextQueryParam(param) {
  const normalizedItems = [];
  const seen = new Set();
  for (const value of normalizeQueryParam(param)) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalizedItems.push(trimmed);
  }
  return normalizedItems;
}

export function normalizeNumericQueryParam(param) {
  const values = normalizeQueryParam(param);
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const parsed = normalizeNonNegativeInteger(values[index]);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function normalizeMatchMode(rawMode) {
  const modeValue = Array.isArray(rawMode) ? rawMode.at(-1) : rawMode;
  if (typeof modeValue !== 'string') return 'all';
  const normalized = modeValue.trim().toLowerCase();
  return ['all', 'any', 'exact'].includes(normalized) ? normalized : 'all';
}

export function normalizeSearchText(rawText) {
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

export function expandStepFigureNames(stepFigureParam, relations, requireAllChildren) {
  const requestedNames = normalizeUniqueTextQueryParam(stepFigureParam);
  if (requestedNames.length === 0) return [];

  const childrenByParent = new Map();
  for (const relation of relations) {
    if (!childrenByParent.has(relation.parent_name)) {
      childrenByParent.set(relation.parent_name, new Set());
    }
    childrenByParent.get(relation.parent_name).add(relation.child_name);
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
