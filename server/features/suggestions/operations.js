export function validatePositiveId(value, error) {
  const parsed = Number.parseInt(value, 10);
  return !Number.isFinite(parsed) || parsed <= 0 ? { error } : { value: parsed };
}

export function parseMaxLevel(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

export function currentSuggestionDate(now) {
  return new Date(now + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function uniqueIds(...groups) {
  return [...new Set(groups.flat())];
}

export function knownFigureNames(rows) {
  return {
    names: [...new Set(rows.map((row) => row.name))],
    namesLower: [...new Set(rows.map((row) => row.name.toLowerCase()))],
  };
}
