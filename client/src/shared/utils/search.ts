/** Case-insensitive "contains" match; an empty query matches everything. */
export function matchesName(name: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === "" || name.toLowerCase().includes(needle);
}
