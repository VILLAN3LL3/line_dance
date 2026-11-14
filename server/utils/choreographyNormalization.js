export function normalizeNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

export function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
}

export function normalizeStringField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeIdArray(value) {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set();
  const ids = [];
  for (const entry of value) {
    const parsed = Number.parseInt(String(entry), 10);
    if (Number.isNaN(parsed) || parsed <= 0 || seenIds.has(parsed)) continue;
    seenIds.add(parsed);
    ids.push(parsed);
  }
  return ids;
}
