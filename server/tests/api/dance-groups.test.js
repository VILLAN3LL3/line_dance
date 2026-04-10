import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import app from '../setup/testApp.js';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

// ---------------------------------------------------------------------------
// Dance Groups CRUD
// ---------------------------------------------------------------------------

describe('GET /api/dance-groups', () => {
  it('returns empty array when no groups exist', async () => {
    const res = await request(app).get('/api/dance-groups');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all groups sorted alphabetically by name', async () => {
    await request(app).post('/api/dance-groups').send({ name: 'Zebra Group' });
    await request(app).post('/api/dance-groups').send({ name: 'Alpha Group' });

    const res = await request(app).get('/api/dance-groups');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Alpha Group');
    expect(res.body[1].name).toBe('Zebra Group');
  });

  it('includes id and created_at fields', async () => {
    await request(app).post('/api/dance-groups').send({ name: 'My Group' });
    const res = await request(app).get('/api/dance-groups');
    expect(res.body[0].id).toBeDefined();
    expect(res.body[0].created_at).toBeDefined();
  });
});

describe('POST /api/dance-groups', () => {
  it('creates a dance group and returns 201', async () => {
    const res = await request(app).post('/api/dance-groups').send({ name: 'Test Group' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Group');
    expect(res.body.id).toBeDefined();
  });

  it('trims whitespace from name', async () => {
    const res = await request(app).post('/api/dance-groups').send({ name: '  Trim Group  ' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trim Group');
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app).post('/api/dance-groups').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 for whitespace-only name', async () => {
    const res = await request(app).post('/api/dance-groups').send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name field', async () => {
    const res = await request(app).post('/api/dance-groups').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for duplicate name', async () => {
    await request(app).post('/api/dance-groups').send({ name: 'Duplicate' });
    const res = await request(app).post('/api/dance-groups').send({ name: 'Duplicate' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('GET /api/dance-groups/:id', () => {
  it('returns the group by id', async () => {
    const created = await request(app).post('/api/dance-groups').send({ name: 'My Group' });
    const res = await request(app).get(`/api/dance-groups/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('My Group');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/api/dance-groups/99999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('PUT /api/dance-groups/:id', () => {
  it('updates the group name', async () => {
    const created = await request(app).post('/api/dance-groups').send({ name: 'Original' });
    const res = await request(app)
      .put(`/api/dance-groups/${created.body.id}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 for non-existent group', async () => {
    const res = await request(app).put('/api/dance-groups/99999').send({ name: 'New' });
    expect(res.status).toBe(404);
  });

  it('returns 400 on name clash with another group', async () => {
    await request(app).post('/api/dance-groups').send({ name: 'Group A' });
    const b = await request(app).post('/api/dance-groups').send({ name: 'Group B' });
    const res = await request(app).put(`/api/dance-groups/${b.body.id}`).send({ name: 'Group A' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 400 for empty name on update', async () => {
    const created = await request(app).post('/api/dance-groups').send({ name: 'G' });
    const res = await request(app).put(`/api/dance-groups/${created.body.id}`).send({ name: '' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/dance-groups/:id', () => {
  it('deletes the group and returns a message', async () => {
    const created = await request(app).post('/api/dance-groups').send({ name: 'ToDelete' });
    const res = await request(app).delete(`/api/dance-groups/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 for non-existent group', async () => {
    const res = await request(app).delete('/api/dance-groups/99999');
    expect(res.status).toBe(404);
  });

  it('cascades deletion to courses belonging to that group', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Cascade Group' });
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.body.id, semester: 'WS 2025' });

    await request(app).delete(`/api/dance-groups/${group.body.id}`);

    const courses = await request(app).get(`/api/dance-courses?dance_group_id=${group.body.id}`);
    expect(courses.body).toHaveLength(0);
  });
});
