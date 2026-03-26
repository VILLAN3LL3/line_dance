import { runQuery, getQuery, allQuery } from '../db.js';

export async function createChoreography(req, res) {
  try {
    const { name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level, creation_year, tag_information, restart_information, isPhrased, authors, tags, step_figures } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    // Get level ID
    const levelRecord = await getQuery('SELECT id FROM levels WHERE name = ?', [level]);
    if (!levelRecord) {
      return res.status(400).json({ error: 'Invalid level. Must be one of: Beginner, Intermediate, Advanced, Experienced' });
    }

    // Insert choreography
    const choreoResult = await runQuery(
      `INSERT INTO choreographies (name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level_id, creation_year, tag_information, restart_information, isPhrased)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, step_sheet_link || null, demo_video_url || null, tutorial_video_url || null, count || null, wall_count || null, levelRecord.id, creation_year || null, tag_information || null, restart_information || null, isPhrased ? 1 : 0]
    );

    const choreography_id = choreoResult.id;

    // Insert authors
    if (authors && Array.isArray(authors)) {
      for (const author of authors) {
        let authorId = await getAuthorId(author);
        if (!authorId) {
          const result = await runQuery(`INSERT INTO authors (name) VALUES (?)`, [author]);
          authorId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)`,
          [choreography_id, authorId]
        );
      }
    }

    // Insert step figures
    if (step_figures && Array.isArray(step_figures)) {
      for (const figure of step_figures) {
        let figureId = await getStepFigureId(figure);
        if (!figureId) {
          const result = await runQuery(`INSERT INTO step_figures (name) VALUES (?)`, [figure]);
          figureId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?)`,
          [choreography_id, figureId]
        );
      }
    }

    // Insert tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        let tagId = await getTagId(tag);
        if (!tagId) {
          const result = await runQuery(`INSERT INTO tags (name) VALUES (?)`, [tag]);
          tagId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)`,
          [choreography_id, tagId]
        );
      }
    }

    res.status(201).json({ id: choreography_id, message: 'Choreography created successfully' });
  } catch (error) {
    console.error('Error creating choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getChoreographies(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const choreographies = await allQuery(
      `SELECT c.*, l.name as level FROM choreographies c
       LEFT JOIN levels l ON c.level_id = l.id
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Enrich with related data
    const enriched = await Promise.all(choreographies.map(c => enrichChoreography(c)));

    const count = await getQuery('SELECT COUNT(*) as count FROM choreographies');

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: count.count,
        totalPages: Math.ceil(count.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching choreographies:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getChoreographyById(req, res) {
  try {
    const choreography = await getQuery(
      'SELECT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id WHERE c.id = ?',
      [req.params.id]
    );

    if (!choreography) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    const enriched = await enrichChoreography(choreography);
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateChoreography(req, res) {
  try {
    const { name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level, creation_year, tag_information, restart_information, isPhrased, authors, tags, step_figures } = req.body;
    const choreography_id = req.params.id;

    // Check if choreography exists
    const existing = await getQuery('SELECT id FROM choreographies WHERE id = ?', [choreography_id]);
    if (!existing) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    let levelId = null;
    if (level) {
      const levelRecord = await getQuery('SELECT id FROM levels WHERE name = ?', [level]);
      if (!levelRecord) {
        return res.status(400).json({ error: 'Invalid level. Must be one of: Beginner, Intermediate, Advanced, Experienced' });
      }
      levelId = levelRecord.id;
    }

    // Update main choreography
    const updateQuery = levelId
      ? `UPDATE choreographies 
         SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, level_id = ?, creation_year = ?, tag_information = ?, restart_information = ?, isPhrased = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      : `UPDATE choreographies 
         SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, creation_year = ?, tag_information = ?, restart_information = ?, isPhrased = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    const updateParams = levelId
      ? [name, step_sheet_link || null, demo_video_url || null, tutorial_video_url || null, count || null, wall_count || null, levelId, creation_year || null, tag_information || null, restart_information || null, isPhrased ? 1 : 0, choreography_id]
      : [name, step_sheet_link || null, demo_video_url || null, tutorial_video_url || null, count || null, wall_count || null, creation_year || null, tag_information || null, restart_information || null, isPhrased ? 1 : 0, choreography_id];

    await runQuery(updateQuery, updateParams);

    // Delete and re-insert authors
    if (authors !== undefined) {
      await runQuery('DELETE FROM choreography_authors WHERE choreography_id = ?', [choreography_id]);
      for (const author of authors) {
        let authorId = await getAuthorId(author);
        if (!authorId) {
          const result = await runQuery(`INSERT INTO authors (name) VALUES (?)`, [author]);
          authorId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)`,
          [choreography_id, authorId]
        );
      }
    }

    // Delete and re-insert step figures
    if (step_figures !== undefined) {
      await runQuery('DELETE FROM choreography_step_figures WHERE choreography_id = ?', [choreography_id]);
      for (const figure of step_figures) {
        let figureId = await getStepFigureId(figure);
        if (!figureId) {
          const result = await runQuery(`INSERT INTO step_figures (name) VALUES (?)`, [figure]);
          figureId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?)`,
          [choreography_id, figureId]
        );
      }
    }

    // Delete and re-insert tags
    if (tags !== undefined) {
      await runQuery('DELETE FROM choreography_tags WHERE choreography_id = ?', [choreography_id]);
      for (const tag of tags) {
        let tagId = await getTagId(tag);
        if (!tagId) {
          const result = await runQuery(`INSERT INTO tags (name) VALUES (?)`, [tag]);
          tagId = result.id;
        }
        await runQuery(
          `INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)`,
          [choreography_id, tagId]
        );
      }
    }

    res.json({ id: choreography_id, message: 'Choreography updated successfully' });
  } catch (error) {
    console.error('Error updating choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteChoreography(req, res) {
  try {
    const choreography_id = req.params.id;

    const result = await runQuery('DELETE FROM choreographies WHERE id = ?', [choreography_id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Choreography not found' });
    }

    res.json({ message: 'Choreography deleted successfully' });
  } catch (error) {
    console.error('Error deleting choreography:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function searchChoreographies(req, res) {
  try {
    const { level, step_figures, tags, authors, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT DISTINCT c.*, l.name as level FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
    let params = [];
    let joins = [];
    let conditions = [];

    // Add search by name or other fields
    if (search) {
      conditions.push('c.name LIKE ?');
      params.push(`%${search}%`);
    }

    // Filter by level
    if (level) {
      conditions.push('l.name = ?');
      params.push(level);
    }

    // Filter by step figures
    if (step_figures) {
      const figures = Array.isArray(step_figures) ? step_figures : [step_figures];
      joins.push(`
        INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
        INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
      `);
      const placeholders = figures.map(() => '?').join(',');
      conditions.push(`sf.name IN (${placeholders})`);
      params.push(...figures);
    }

    // Filter by tags
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      joins.push(`
        INNER JOIN choreography_tags ct ON c.id = ct.choreography_id
        INNER JOIN tags t ON ct.tag_id = t.id
      `);
      const placeholders = tagList.map(() => '?').join(',');
      conditions.push(`t.name IN (${placeholders})`);
      params.push(...tagList);
    }

    // Filter by authors
    if (authors) {
      const authorList = Array.isArray(authors) ? authors : [authors];
      joins.push(`
        INNER JOIN choreography_authors ca ON c.id = ca.choreography_id
        INNER JOIN authors a ON ca.author_id = a.id
      `);
      const placeholders = authorList.map(() => '?').join(',');
      conditions.push(`a.name IN (${placeholders})`);
      params.push(...authorList);
    }

    // Build final query
    if (joins.length > 0) {
      query += joins.join('');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const choreographies = await allQuery(query, params);
    const enriched = await Promise.all(choreographies.map(c => enrichChoreography(c)));

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT c.id) as count FROM choreographies c LEFT JOIN levels l ON c.level_id = l.id';
    let countParams = [];
    let countConditions = [];

    if (search) {
      countConditions.push('c.name LIKE ?');
      countParams.push(`%${search}%`);
    }

    if (level) {
      countConditions.push('l.name = ?');
      countParams.push(level);
    }

    if (step_figures) {
      const figures = Array.isArray(step_figures) ? step_figures : [step_figures];
      countQuery += `
        INNER JOIN choreography_step_figures csf ON c.id = csf.choreography_id
        INNER JOIN step_figures sf ON csf.step_figure_id = sf.id
      `;
      const placeholders = figures.map(() => '?').join(',');
      countConditions.push(`sf.name IN (${placeholders})`);
      countParams.push(...figures);
    }

    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      countQuery += `
        INNER JOIN choreography_tags ct ON c.id = ct.choreography_id
        INNER JOIN tags t ON ct.tag_id = t.id
      `;
      const placeholders = tagList.map(() => '?').join(',');
      countConditions.push(`t.name IN (${placeholders})`);
      countParams.push(...tagList);
    }

    if (authors) {
      const authorList = Array.isArray(authors) ? authors : [authors];
      countQuery += `
        INNER JOIN choreography_authors ca ON c.id = ca.choreography_id
        INNER JOIN authors a ON ca.author_id = a.id
      `;
      const placeholders = authorList.map(() => '?').join(',');
      countConditions.push(`a.name IN (${placeholders})`);
      countParams.push(...authorList);
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await getQuery(countQuery, countParams);

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    });
  } catch (error) {
    console.error('Error searching choreographies:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper functions
async function enrichChoreography(choreography) {
  const authors = await allQuery(
    `SELECT a.name FROM authors a
     INNER JOIN choreography_authors ca ON a.id = ca.author_id
     WHERE ca.choreography_id = ?`,
    [choreography.id]
  );

  const tags = await allQuery(
    `SELECT t.name FROM tags t
     INNER JOIN choreography_tags ct ON t.id = ct.tag_id
     WHERE ct.choreography_id = ?`,
    [choreography.id]
  );

  const step_figures = await allQuery(
    `SELECT sf.name FROM step_figures sf
     INNER JOIN choreography_step_figures csf ON sf.id = csf.step_figure_id
     WHERE csf.choreography_id = ?`,
    [choreography.id]
  );

  return {
    ...choreography,
    authors: authors.map(a => a.name),
    tags: tags.map(t => t.name),
    step_figures: step_figures.map(sf => sf.name)
  };
}

async function getAuthorId(name) {
  const result = await getQuery('SELECT id FROM authors WHERE name = ?', [name]);
  return result ? result.id : null;
}

async function getStepFigureId(name) {
  const result = await getQuery('SELECT id FROM step_figures WHERE name = ?', [name]);
  return result ? result.id : null;
}

async function getTagId(name) {
  const result = await getQuery('SELECT id FROM tags WHERE name = ?', [name]);
  return result ? result.id : null;
}

export async function getLevels(req, res) {
  try {
    const levels = await allQuery('SELECT id, name FROM levels ORDER BY id');
    res.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getTags(req, res) {
  try {
    const tags = await allQuery('SELECT name FROM tags ORDER BY name');
    res.json(tags.map(t => t.name));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getAuthors(req, res) {
  try {
    const authors = await allQuery('SELECT name FROM authors ORDER BY name');
    res.json(authors.map(a => a.name));
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function addLevel(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Level name is required' });
    }

    const result = await runQuery(
      'INSERT INTO levels (name) VALUES (?)',
      [name.trim()]
    );

    res.status(201).json({ id: result.id, name: name.trim() });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'This level already exists' });
    }
    console.error('Error adding level:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getStepFigures(req, res) {
  try {
    const figures = await allQuery('SELECT name FROM step_figures ORDER BY name');
    res.json(figures.map(f => f.name));
  } catch (error) {
    console.error('Error fetching step figures:', error);
    res.status(500).json({ error: error.message });
  }
}
