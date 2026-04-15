import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupChoreographyTestDb, clearChoreographyTables } from '../setup/testChoreographyDb.js';
import app from '../setup/testChoreographyApp.js';
import { allQuery } from '../../scripts/db.js';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createChoreo(overrides = {}) {
  const res = await request(app)
    .post('/api/choreographies')
    .send({
      name: 'Test Dance',
      level: 'Beginner',
      count: 32,
      wall_count: 4,
      ...overrides,
    });
  return res.body;
}

// ---------------------------------------------------------------------------
// GET /api/choreographies
// ---------------------------------------------------------------------------

describe('GET /api/choreographies', () => {
  it('returns empty data array when no choreographies exist', async () => {
    const res = await request(app).get('/api/choreographies');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('returns created choreographies with enriched fields', async () => {
    await createChoreo({
      name: 'My Dance',
      authors: ['Jane'],
      tags: ['fun'],
      step_figures: ['Mambo'],
    });

    const res = await request(app).get('/api/choreographies');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const c = res.body.data[0];
    expect(c.name).toBe('My Dance');
    expect(c.authors).toEqual(['Jane']);
    expect(c.tags).toEqual(['fun']);
    expect(c.step_figures).toEqual(['Mambo']);
  });

  it('paginates results with page and limit params', async () => {
    for (let i = 1; i <= 5; i++) {
      await createChoreo({ name: `Dance ${i}` });
    }

    const res = await request(app).get('/api/choreographies?page=1&limit=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.totalPages).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// POST /api/choreographies
// ---------------------------------------------------------------------------

describe('POST /api/choreographies', () => {
  it('creates a choreography with required fields only and returns 201', async () => {
    const res = await request(app)
      .post('/api/choreographies')
      .send({ name: 'Simple Dance', level: 'Intermediate' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.message).toMatch(/created/i);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/choreographies').send({ level: 'Beginner' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when level is missing', async () => {
    const res = await request(app).post('/api/choreographies').send({ name: 'No Level Dance' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 for an invalid level name', async () => {
    const res = await request(app)
      .post('/api/choreographies')
      .send({ name: 'Bad Level', level: 'Expert' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid level/i);
  });

  it('attaches multiple authors to the choreography', async () => {
    const create = await request(app)
      .post('/api/choreographies')
      .send({ name: 'Multi Author', level: 'Advanced', authors: ['Alice', 'Bob'] });

    expect(create.status).toBe(201);

    const res = await request(app).get(`/api/choreographies/${create.body.id}`);
    expect(res.body.authors.sort()).toEqual(['Alice', 'Bob']);
  });

  it('attaches tags and step_figures to the choreography', async () => {
    const create = await request(app)
      .post('/api/choreographies')
      .send({
        name: 'Tagged Dance',
        level: 'Beginner',
        tags: ['fun'],
        step_figures: ['Cha Cha', 'Mambo'],
      });

    const res = await request(app).get(`/api/choreographies/${create.body.id}`);
    expect(res.body.tags).toEqual(['fun']);
    expect(res.body.step_figures.sort()).toEqual(['Cha Cha', 'Mambo']);
  });
});

// ---------------------------------------------------------------------------
// GET /api/choreographies/:id
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/:id', () => {
  it('returns the choreography with enriched fields', async () => {
    const created = await createChoreo({ name: 'Find Me', level: 'Advanced', count: 48 });

    const res = await request(app).get(`/api/choreographies/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Find Me');
    expect(res.body.count).toBe(48);
    expect(res.body.level).toBe('ADVANCED');
    expect(Array.isArray(res.body.authors)).toBe(true);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).get('/api/choreographies/99999');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/choreographies/:id
// ---------------------------------------------------------------------------

describe('PUT /api/choreographies/:id', () => {
  it('updates basic fields', async () => {
    const created = await createChoreo({ name: 'Old Name', level: 'Beginner', count: 32 });

    const res = await request(app)
      .put(`/api/choreographies/${created.id}`)
      .send({ name: 'New Name', level: 'Intermediate', count: 64 });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(String(created.id));
    expect(res.body.message).toMatch(/updated/i);

    const updated = await request(app).get(`/api/choreographies/${created.id}`);
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('New Name');
    expect(updated.body.count).toBe(64);
    expect(updated.body.level).toBe('INTERMEDIATE');
  });

  it('replaces authors on update', async () => {
    const created = await createChoreo({
      name: 'Change Me',
      level: 'Beginner',
      authors: ['Alice'],
    });

    await request(app)
      .put(`/api/choreographies/${created.id}`)
      .send({ name: 'Change Me', level: 'Beginner', authors: ['Bob', 'Carol'] });

    const res = await request(app).get(`/api/choreographies/${created.id}`);
    expect(res.body.authors.sort()).toEqual(['Bob', 'Carol']);
  });

  it('replaces step_figures on update', async () => {
    const created = await createChoreo({
      name: 'Move Me',
      level: 'Beginner',
      step_figures: ['Mambo'],
    });

    await request(app)
      .put(`/api/choreographies/${created.id}`)
      .send({ name: 'Move Me', level: 'Beginner', step_figures: ['Cha Cha'] });

    const res = await request(app).get(`/api/choreographies/${created.id}`);
    expect(res.body.step_figures).toEqual(['Cha Cha']);
  });

  it('cleans up orphaned tags after update but preserves the step figure catalog', async () => {
    const created = await createChoreo({
      name: 'Cleanup On Update',
      level: 'Beginner',
      tags: ['old-tag'],
      step_figures: ['Old Figure'],
    });

    const update = await request(app)
      .put(`/api/choreographies/${created.id}`)
      .send({
        name: 'Cleanup On Update',
        level: 'Beginner',
        tags: ['new-tag'],
        step_figures: ['New Figure'],
      });

    expect(update.status).toBe(200);

    const tags = await request(app).get('/api/tags');
    const figures = await request(app).get('/api/step_figures');
    expect(tags.body).toEqual(['new-tag']);
    expect(figures.body).toEqual(['New Figure', 'Old Figure']);
  });

  it('cleans up orphaned levels after update to a different level', async () => {
    const addLevel = await request(app)
      .post('/api/levels')
      .send({ name: 'TEMP UPDATE LEVEL', value: 999 });
    expect(addLevel.status).toBe(201);

    const created = await createChoreo({
      name: 'Level Update',
      level: 'TEMP UPDATE LEVEL',
    });

    const update = await request(app).put(`/api/choreographies/${created.id}`).send({
      name: 'Level Update',
      level: 'Advanced',
    });

    expect(update.status).toBe(200);

    let levelNames = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const levels = await request(app).get('/api/levels');
      levelNames = levels.body.map((l) => l.name);
      if (!levelNames.includes('TEMP UPDATE LEVEL')) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(levelNames).not.toContain('TEMP UPDATE LEVEL');
    expect(levelNames).toContain('ADVANCED');
  });

  it('returns 404 for a non-existent choreography', async () => {
    const res = await request(app)
      .put('/api/choreographies/99999')
      .send({ name: 'Ghost', level: 'Beginner' });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/choreographies/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/choreographies/:id', () => {
  it('deletes a choreography and returns a message', async () => {
    const created = await createChoreo();

    const res = await request(app).delete(`/api/choreographies/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const get = await request(app).get(`/api/choreographies/${created.id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for a non-existent choreography', async () => {
    const res = await request(app).delete('/api/choreographies/99999');
    expect(res.status).toBe(404);
  });

  it('cleans up orphaned authors on delete', async () => {
    await createChoreo({ name: 'With Author', level: 'Beginner', authors: ['Orphan Author'] });
    const created2 = await createChoreo({ name: 'Other', level: 'Beginner' });

    // Delete choreography that owns the author
    const firstId = (await request(app).get('/api/choreographies?limit=100')).body.data.find(
      (c) => c.name === 'With Author',
    ).id;
    await request(app).delete(`/api/choreographies/${firstId}`);

    const authors = await request(app).get('/api/authors');
    expect(authors.body).not.toContain('Orphan Author');

    // Other choreography still exists
    const get = await request(app).get(`/api/choreographies/${created2.id}`);
    expect(get.status).toBe(200);
  });

  it('cleans up orphaned tags and levels on delete but preserves the step figure catalog', async () => {
    const addLevel = await request(app)
      .post('/api/levels')
      .send({ name: 'TEMP DELETE LEVEL', value: 998 });
    expect(addLevel.status).toBe(201);

    const created = await createChoreo({
      name: 'Delete Cleanup',
      level: 'TEMP DELETE LEVEL',
      tags: ['to-delete-tag'],
      step_figures: ['To Delete Figure'],
    });

    const del = await request(app).delete(`/api/choreographies/${created.id}`);
    expect(del.status).toBe(200);

    const tags = await request(app).get('/api/tags');
    const figures = await request(app).get('/api/step_figures');
    const levels = await request(app).get('/api/levels');
    const levelNames = levels.body.map((l) => l.name);

    expect(tags.body).toEqual([]);
    expect(figures.body).toEqual(['To Delete Figure']);
    expect(levelNames).not.toContain('TEMP DELETE LEVEL');
    expect(levelNames).toContain('BEGINNER');
  });
});

// ---------------------------------------------------------------------------
// Database separation regression
// ---------------------------------------------------------------------------

describe('tags storage separation', () => {
  it('stores tags tables only in personal_data schema, not in main schema', async () => {
    const mainTables = await allQuery(
      `SELECT name
       FROM main.sqlite_master
       WHERE type = 'table'
         AND name IN ('tags', 'choreography_tags')`,
    );

    const personalTables = await allQuery(
      `SELECT name
       FROM personal_data.sqlite_master
       WHERE type = 'table'
         AND name IN ('tags', 'choreography_tags')`,
    );

    expect(mainTables).toEqual([]);
    expect(personalTables.map((row) => row.name).sort()).toEqual(['choreography_tags', 'tags']);
  });
});

// ---------------------------------------------------------------------------
// GET /api/choreographies/max-count
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/max-count', () => {
  it('returns 0 when there are no choreographies', async () => {
    const res = await request(app).get('/api/choreographies/max-count');
    expect(res.status).toBe(200);
    expect(res.body.max_count).toBe(0);
  });

  it('returns the highest count value across all choreographies', async () => {
    await createChoreo({ name: 'Dance A', count: 32 });
    await createChoreo({ name: 'Dance B', count: 64 });
    await createChoreo({ name: 'Dance C', count: 48 });

    const res = await request(app).get('/api/choreographies/max-count');
    expect(res.body.max_count).toBe(64);
  });

  it('ignores choreographies with null count', async () => {
    await createChoreo({ name: 'No Count', count: undefined });
    await createChoreo({ name: 'With Count', count: 16 });

    const res = await request(app).get('/api/choreographies/max-count');
    expect(res.body.max_count).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// GET /api/levels
// ---------------------------------------------------------------------------

describe('GET /api/levels', () => {
  it('returns canonical default levels sorted by value ascending', async () => {
    const res = await request(app).get('/api/levels');
    expect(res.status).toBe(200);
    const names = res.body.map((l) => l.name);
    const values = res.body.map((l) => l.value);
    expect(names).toEqual([
      'UNKNOWN',
      'ABSOLUTE BEGINNER',
      'EASY BEGINNER',
      'BEGINNER',
      'HIGH BEGINNER',
      'LOW IMPROVER',
      'EASY IMPROVER',
      'IMPROVER',
      'HIGH IMPROVER',
      'LOW INTERMEDIATE',
      'EASY INTERMEDIATE',
      'INTERMEDIATE',
      'HIGH INTERMEDIATE',
      'LOW ADVANCED',
      'EASY ADVANCED',
      'ADVANCED',
      'HIGH ADVANCED',
    ]);
    expect(values).toEqual([
      0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
    ]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/levels
// ---------------------------------------------------------------------------

describe('POST /api/levels', () => {
  it('creates a new level and returns 201', async () => {
    const res = await request(app).post('/api/levels').send({ name: 'Pro' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Pro');
    expect(res.body.id).toBeDefined();
    expect(res.body.value).toBe(170);
  });

  it('creates a new level with explicit value', async () => {
    const res = await request(app).post('/api/levels').send({ name: 'Novice', value: 5 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Novice');
    expect(res.body.value).toBe(5);

    const levels = await request(app).get('/api/levels');
    expect(levels.body.map((l) => l.name)).toEqual([
      'UNKNOWN',
      'Novice',
      'ABSOLUTE BEGINNER',
      'EASY BEGINNER',
      'BEGINNER',
      'HIGH BEGINNER',
      'LOW IMPROVER',
      'EASY IMPROVER',
      'IMPROVER',
      'HIGH IMPROVER',
      'LOW INTERMEDIATE',
      'EASY INTERMEDIATE',
      'INTERMEDIATE',
      'HIGH INTERMEDIATE',
      'LOW ADVANCED',
      'EASY ADVANCED',
      'ADVANCED',
      'HIGH ADVANCED',
    ]);
  });

  it('returns 400 for an empty level name', async () => {
    const res = await request(app).post('/api/levels').send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-integer value', async () => {
    const res = await request(app).post('/api/levels').send({ name: 'Custom', value: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/value must be an integer/i);
  });

  it('returns 400 for a duplicate level name', async () => {
    const res = await request(app).post('/api/levels').send({ name: 'Beginner' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/tags, /api/authors, /api/step_figures
// ---------------------------------------------------------------------------

describe('lookup endpoints', () => {
  it('GET /api/tags returns names of all tags sorted alphabetically', async () => {
    await createChoreo({ name: 'Dance A', tags: ['Waltz', 'Cha Cha'] });
    await createChoreo({ name: 'Dance B', tags: ['Mambo'] });

    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['Cha Cha', 'Mambo', 'Waltz']);
  });

  it('GET /api/authors returns names of all authors sorted alphabetically', async () => {
    await createChoreo({ name: 'Dance A', authors: ['Zara', 'Alice'] });

    const res = await request(app).get('/api/authors');
    expect(res.body).toEqual(['Alice', 'Zara']);
  });

  it('GET /api/step_figures returns sorted step figure names', async () => {
    await createChoreo({ name: 'Dance A', step_figures: ['Rock Step', 'Cha Cha'] });

    const res = await request(app).get('/api/step_figures');
    expect(res.body).toEqual(['Cha Cha', 'Rock Step']);
  });
});
