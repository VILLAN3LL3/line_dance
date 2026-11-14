import { runQuery, getQuery, allQuery } from '../scripts/db.js';
import { captureError } from './choreography-shared.js';

export async function getLevels(req, res) {
  try {
    const levels = await allQuery(
      'SELECT id, name, value FROM levels ORDER BY value ASC, LOWER(name) ASC',
    );
    res.json(levels);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
}

export async function getTags(req, res) {
  try {
    const tags = await allQuery('SELECT name FROM personal_data.tags ORDER BY name');
    res.json(tags.map((t) => t.name));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

export async function getChoreographyInfoCategories(req, res) {
  try {
    const categories = await allQuery(
      `SELECT name FROM choreography_info_categories
       ORDER BY is_seeded DESC, id ASC`,
    );
    res.json(categories.map((category) => category.name));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography information categories' });
  }
}

export async function getAuthors(req, res) {
  try {
    const authors = await allQuery('SELECT name FROM authors ORDER BY name');
    res.json(authors.map((a) => a.name));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
}

export async function getAuthorStats(req, res) {
  try {
    const rows = await allQuery(
      `SELECT a.name AS author_name, l.name AS level_name, COUNT(DISTINCT ca.choreography_id) AS count
       FROM authors a
       JOIN choreography_authors ca ON a.id = ca.author_id
       JOIN choreographies c ON ca.choreography_id = c.id
       LEFT JOIN levels l ON c.level_id = l.id
       GROUP BY a.id, l.id
       ORDER BY a.name ASC, l.name ASC`,
    );

    // Aggregate rows into per-author objects
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.author_name)) {
        map.set(row.author_name, { name: row.author_name, total: 0, by_level: {} });
      }
      const entry = map.get(row.author_name);
      const count = Number(row.count);
      entry.total += count;
      if (row.level_name) {
        entry.by_level[row.level_name] = count;
      }
    }

    res.json([...map.values()]);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch author stats' });
  }
}

export async function addLevel(req, res) {
  try {
    const { name, value } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Level name is required' });
    }

    const normalizedName = name.trim();
    const existing = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [
      normalizedName,
    ]);
    if (existing) {
      return res.status(400).json({ error: 'This level already exists' });
    }

    let numericValue;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      numericValue = Number.parseInt(String(value), 10);
      if (Number.isNaN(numericValue)) {
        return res.status(400).json({ error: 'Level value must be an integer' });
      }
    } else {
      const maxValue = await getQuery(`SELECT COALESCE(MAX(value), 0) AS max_value FROM levels`);
      numericValue = Number(maxValue?.max_value || 0) + 10;
    }

    const result = await runQuery('INSERT INTO levels (name, value) VALUES (?, ?)', [
      normalizedName,
      numericValue,
    ]);

    res.status(201).json({ id: result.id, name: normalizedName, value: numericValue });
  } catch (error) {
    captureError(error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'This level already exists' });
    }
    res.status(500).json({ error: 'Failed to add level' });
  }
}

export async function getMaxChoreographyCount(req, res) {
  try {
    const result = await getQuery(
      'SELECT MAX(count) as max_count FROM choreographies WHERE count IS NOT NULL',
    );
    const maxCount = result?.max_count || 0;
    res.json({ max_count: maxCount });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch max choreography count' });
  }
}

export async function getCountryCodes(req, res) {
  try {
    const rows = await allQuery(
      'SELECT iso_2_code, iso_3_code, name FROM countries ORDER BY iso_2_code',
    );
    // Return a map of both 2-char and 3-char codes to country name
    const result = {};
    for (const r of rows) {
      result[r.iso_2_code] = r.name;
      result[r.iso_3_code] = r.name;
    }

    // Also include community aliases (e.g. IRE => Ireland)
    const aliases = await allQuery(
      `SELECT a.alias, c.name
       FROM country_code_aliases a
       JOIN countries c ON a.country_id = c.id`,
    );
    for (const a of aliases) {
      result[a.alias] = a.name;
    }

    res.json(result);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch country codes' });
  }
}
