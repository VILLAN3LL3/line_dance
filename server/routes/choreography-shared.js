import { DATABASE_RESTARTING_ERROR_CODE, getQuery, allQuery } from '../scripts/db.js';

export function captureError(error) {
  if (error?.code === DATABASE_RESTARTING_ERROR_CODE) {
    throw error;
  }

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const details = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`[choreographies] ${details}\n`);
}

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
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set();
  const ids = [];

  for (const entry of value) {
    const parsed = Number.parseInt(String(entry), 10);
    if (Number.isNaN(parsed) || parsed <= 0 || seenIds.has(parsed)) {
      continue;
    }
    seenIds.add(parsed);
    ids.push(parsed);
  }

  return ids;
}

export async function enrichChoreography(choreography) {
  const authors = await allQuery(
    `SELECT a.name FROM authors a
     INNER JOIN choreography_authors ca ON a.id = ca.author_id
     WHERE ca.choreography_id = ?`,
    [choreography.id],
  );

  const tags = await allQuery(
    `SELECT t.name FROM personal_data.tags t
     INNER JOIN personal_data.choreography_tags ct ON t.id = ct.tag_id
     WHERE ct.choreography_id = ?`,
    [choreography.id],
  );

  const step_figures = await allQuery(
    `SELECT sf.name FROM step_figures sf
     INNER JOIN choreography_step_figures csf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id = ?`,
    [choreography.id],
  );

  const choreography_information = await allQuery(
    `SELECT info.id, category.name AS category, info.description
     FROM choreography_information info
     INNER JOIN choreography_info_categories category ON category.id = info.category_id
     WHERE info.choreography_id = ?
     ORDER BY info.id ASC`,
    [choreography.id],
  );

  const ratingRow = await getQuery(
    `SELECT rating FROM personal_data.choreography_ratings WHERE choreography_id = ?`,
    [choreography.id],
  );

  const authorNames = authors.map((a) => a.name);

  return {
    ...choreography,
    authors: authorNames,
    tags: tags.map((t) => t.name),
    step_figures: step_figures.map((sf) => sf.name),
    choreography_information,
    rating: ratingRow ? ratingRow.rating : null,
  };
}
