import { getQuery, allQuery } from '../scripts/db.js';
import {
  createChoreographyRecord,
  updateChoreographyRecord,
  deleteChoreographyRecord,
} from './choreography-write.js';
import { captureError, enrichChoreography, normalizeStringArray } from './choreography-shared.js';
import { getChoreographyValidationIssues } from './choreography-validation.js';

function sendChoreographyValidationError(res, issues) {
  let error = 'Choreography validation failed';
  if (
    issues.some(
      (issue) => (issue.field === 'name' || issue.field === 'level') && issue.key === 'required',
    )
  ) {
    error = 'Name and level are required';
  } else if (issues.some((issue) => issue.key === 'invalid_level')) {
    error = 'Invalid level. Must be one of the configured levels';
  } else if (issues.some((issue) => issue.key === 'invalid_information')) {
    error = 'Choreography information must be an array of category and description entries';
  }
  return res.status(400).json({ error, issues });
}

export async function validateChoreography(req, res) {
  try {
    const issues = await getChoreographyValidationIssues(req.body);
    if (issues.length) return sendChoreographyValidationError(res, issues);
    return res.json({ valid: true });
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to validate choreography' });
  }
}

export async function createChoreography(req, res) {
  try {
    const issues = await getChoreographyValidationIssues(req.body);
    if (issues.length) return sendChoreographyValidationError(res, issues);

    const choreography_id = await createChoreographyRecord(req.body);

    if (choreography_id === null) {
      return sendChoreographyValidationError(res, [{ field: 'level', key: 'invalid_level' }]);
    }

    res.status(201).json({ id: choreography_id, message: 'Choreography created successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create choreography' });
  }
}

export async function checkDuplicateChoreographies(req, res) {
  try {
    const { name, level, exclude_id } = req.query;
    const rawAuthors = req.query.authors;
    let coercedAuthors;
    if (Array.isArray(rawAuthors)) {
      coercedAuthors = rawAuthors;
    } else if (rawAuthors) {
      coercedAuthors = [rawAuthors];
    } else {
      coercedAuthors = [];
    }
    const authors = normalizeStringArray(coercedAuthors);

    if (!name || !level || authors.length === 0) {
      return res.json([]);
    }

    const excludeId = Number.parseInt(exclude_id, 10);
    const hasExcludeId = Number.isFinite(excludeId) && excludeId > 0;

    const authorUpperPlaceholders = authors.map(() => 'UPPER(?)').join(', ');
    const params = [name, level, ...(hasExcludeId ? [excludeId] : []), ...authors];

    const rows = await allQuery(
      `SELECT c.id, c.name, l.name AS level
       FROM choreographies c
       JOIN levels l ON c.level_id = l.id
       WHERE UPPER(c.name) = UPPER(?)
         AND UPPER(l.name) = UPPER(?)
         ${hasExcludeId ? 'AND c.id != ?' : ''}
         AND c.id IN (
           SELECT ca.choreography_id
           FROM choreography_authors ca
           JOIN authors a ON a.id = ca.author_id
           WHERE UPPER(a.name) IN (${authorUpperPlaceholders})
         )`,
      params,
    );

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const rowAuthors = await allQuery(
          `SELECT a.name FROM authors a
           JOIN choreography_authors ca ON ca.author_id = a.id
           WHERE ca.choreography_id = ?`,
          [row.id],
        );
        return { ...row, authors: rowAuthors.map((a) => a.name) };
      }),
    );

    return res.json(enriched);
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to check duplicates' });
  }
}

export async function getChoreographies(req, res) {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const choreographies = await allQuery(
      `SELECT c.*, l.name as level FROM choreographies c
       LEFT JOIN levels l ON c.level_id = l.id
       ORDER BY LOWER(c.name) ASC, COALESCE(l.value, 2147483647) ASC LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    // Enrich with related data
    const enriched = await Promise.all(choreographies.map((c) => enrichChoreography(c)));

    const count = await getQuery('SELECT COUNT(*) as count FROM choreographies');

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: count.count,
        totalPages: Math.ceil(count.count / limit),
      },
    });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreographies' });
  }
}

export async function getChoreographyById(req, res) {
  try {
    const choreography = await getQuery(
      'SELECT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id WHERE c.id = ?',
      [req.params.id],
    );

    if (!choreography) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const enriched = await enrichChoreography(choreography);
    res.json(enriched);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography' });
  }
}

export async function updateChoreography(req, res) {
  try {
    const choreography_id = req.params.id;

    const existing = await getQuery('SELECT id FROM choreographies WHERE id = ?', [
      choreography_id,
    ]);
    if (!existing) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const issues = await getChoreographyValidationIssues(req.body, { partial: true });
    if (issues.length) return sendChoreographyValidationError(res, issues);

    const result = await updateChoreographyRecord(choreography_id, req.body);
    if (result === 'not_found') return res.status(404).json({ error: 'Choreography not found' });
    if (result === 'invalid_level') {
      return sendChoreographyValidationError(res, [{ field: 'level', key: 'invalid_level' }]);
    }
    res.json({ id: choreography_id, message: 'Choreography updated successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update choreography' });
  }
}

export async function deleteChoreography(req, res) {
  try {
    const choreography_id = req.params.id;

    const result = await deleteChoreographyRecord(choreography_id);

    if (!result) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    res.json({ message: 'Choreography deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete choreography' });
  }
}
