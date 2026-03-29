import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupChoreographyTestDb, clearChoreographyTables } from '../setup/testChoreographyDb.js';
import app from '../setup/testChoreographyApp.js';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConfig(name, filters = {}) {
  return request(app)
    .post('/api/saved-filters')
    .send({ name, filters });
}

// ---------------------------------------------------------------------------
// GET /api/saved-filters
// ---------------------------------------------------------------------------

describe('GET /api/saved-filters', () => {
  it('returns an empty array when no configurations exist', async () => {
    const res = await request(app).get('/api/saved-filters');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all saved configurations sorted alphabetically by name', async () => {
    await createConfig('Zebra Filter');
    await createConfig('Alpha Filter');

    const res = await request(app).get('/api/saved-filters');
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Alpha Filter');
    expect(res.body[1].name).toBe('Zebra Filter');
  });

  it('includes id, name, filters, created_at, updated_at fields', async () => {
    await createConfig('My Filter', { search: 'Waltz', level: ['Beginner'] });

    const res = await request(app).get('/api/saved-filters');
    const cfg = res.body[0];
    expect(cfg.id).toBeDefined();
    expect(cfg.name).toBe('My Filter');
    expect(cfg.filters.search).toBe('Waltz');
    expect(cfg.filters.level).toEqual(['Beginner']);
    expect(cfg.created_at).toBeDefined();
    expect(cfg.updated_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/saved-filters
// ---------------------------------------------------------------------------

describe('POST /api/saved-filters', () => {
  it('creates a configuration and returns 201', async () => {
    const res = await createConfig('New Filter', { search: 'Tango' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Filter');
    expect(res.body.filters.search).toBe('Tango');
    expect(res.body.id).toBeDefined();
  });

  it('trims whitespace from the configuration name', async () => {
    const res = await createConfig('  Trimmed  ');
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trimmed');
  });

  it('returns 400 when name is empty', async () => {
    const res = await createConfig('');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when name is whitespace-only', async () => {
    const res = await createConfig('   ');
    expect(res.status).toBe(400);
  });

  it('upserts when same name is used again (updates filters, same id)', async () => {
    const first = await createConfig('Upsert Me', { search: 'Waltz' });
    const second = await createConfig('Upsert Me', { search: 'Tango', level: ['Advanced'] });

    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.filters.search).toBe('Tango');
    expect(second.body.filters.level).toEqual(['Advanced']);

    const all = await request(app).get('/api/saved-filters');
    expect(all.body).toHaveLength(1);
  });

  it('normalizes the filters object (strips unknown fields)', async () => {
    const res = await createConfig('Clean Filter', { search: 'Waltz', unknown: 'ignored' });
    expect(res.status).toBe(201);
    expect(res.body.filters).not.toHaveProperty('unknown');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/saved-filters/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/saved-filters/:id', () => {
  it('updates the name', async () => {
    const created = await createConfig('Original');

    const res = await request(app)
      .patch(`/api/saved-filters/${created.body.id}`)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
  });

  it('updates the filters', async () => {
    const created = await createConfig('Filter Config', { search: 'Waltz' });

    const res = await request(app)
      .patch(`/api/saved-filters/${created.body.id}`)
      .send({ filters: { search: 'Tango', level: ['Intermediate'] } });

    expect(res.status).toBe(200);
    expect(res.body.filters.search).toBe('Tango');
    expect(res.body.filters.level).toEqual(['Intermediate']);
  });

  it('updates both name and filters at once', async () => {
    const created = await createConfig('Old Name', { search: 'X' });

    const res = await request(app)
      .patch(`/api/saved-filters/${created.body.id}`)
      .send({ name: 'New Name', filters: { search: 'Y' } });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.filters.search).toBe('Y');
  });

  it('returns 404 for a non-existent configuration', async () => {
    const res = await request(app)
      .patch('/api/saved-filters/99999')
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when neither name nor filters is provided', async () => {
    const created = await createConfig('Unchanged');

    const res = await request(app)
      .patch(`/api/saved-filters/${created.body.id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nothing to update/i);
  });

  it('returns 400 when name is set to empty string', async () => {
    const created = await createConfig('Good Name');

    const res = await request(app)
      .patch(`/api/saved-filters/${created.body.id}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when updating to a name already used by another configuration', async () => {
    await createConfig('First');
    const second = await createConfig('Second');

    const res = await request(app)
      .patch(`/api/saved-filters/${second.body.id}`)
      .send({ name: 'First' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/saved-filters/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/saved-filters/:id', () => {
  it('deletes a configuration and returns a success message', async () => {
    const created = await createConfig('Delete Me');

    const res = await request(app).delete(`/api/saved-filters/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const all = await request(app).get('/api/saved-filters');
    expect(all.body).toHaveLength(0);
  });

  it('returns 404 for a non-existent configuration', async () => {
    const res = await request(app).delete('/api/saved-filters/99999');
    expect(res.status).toBe(404);
  });
});
