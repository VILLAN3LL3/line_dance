export function validateLevelName(input) {
  const { name } = input;
  if (!name?.trim()) return { error: 'name_required' };
  return { value: name.trim() };
}

export function validateLevelValue(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { value: null };
  const value = Number.parseInt(String(raw), 10);
  return Number.isNaN(value) ? { error: 'invalid_value' } : { value };
}

export function nextLevelValue(maxValue) {
  return Number(maxValue || 0) + 10;
}

export function authorStatistics(rows) {
  const authors = new Map();
  for (const row of rows) {
    if (!authors.has(row.author_name)) {
      authors.set(row.author_name, { name: row.author_name, total: 0, by_level: {} });
    }
    const author = authors.get(row.author_name);
    const count = Number(row.count);
    author.total += count;
    if (row.level_name) author.by_level[row.level_name] = count;
  }
  return [...authors.values()];
}

export function countryCodeMap(countries, aliases) {
  const result = {};
  for (const country of countries) {
    result[country.iso_2_code] = country.name;
    result[country.iso_3_code] = country.name;
  }
  for (const alias of aliases) result[alias.alias] = alias.name;
  return result;
}
