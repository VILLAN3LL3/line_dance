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

const BASE = { name: 'Jane Doe', phone: '+49123456789', email: 'jane@example.com' };

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/trainers', () => {
  it('returns empty array when no trainers exist', async () => {
    const res = await request(app).get('/api/trainers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns trainers sorted case-insensitively by name', async () => {
    await request(app).post('/api/trainers').send({ name: 'zara', phone: '1', email: 'z@z.com' });
    await request(app).post('/api/trainers').send({ name: 'Anna', phone: '2', email: 'a@a.com' });
    await request(app).post('/api/trainers').send({ name: 'mike', phone: '3', email: 'm@m.com' });

    const res = await request(app).get('/api/trainers');
    expect(res.body.map((t) => t.name)).toEqual(['Anna', 'mike', 'zara']);
  });

  it('includes all fields in the response', async () => {
    await request(app).post('/api/trainers').send(BASE);
    const res = await request(app).get('/api/trainers');
    const trainer = res.body[0];
    expect(trainer).toMatchObject({ name: BASE.name, phone: BASE.phone, email: BASE.email });
    expect(trainer.id).toBeDefined();
    expect(trainer.created_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe('POST /api/trainers', () => {
  it('creates a trainer and returns 201', async () => {
    const res = await request(app).post('/api/trainers').send(BASE);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: BASE.name, phone: BASE.phone, email: BASE.email });
    expect(res.body.id).toBeDefined();
  });

  it('trims whitespace from all fields', async () => {
    const res = await request(app).post('/api/trainers').send({
      name: '  John  ',
      phone: '  +49111  ',
      email: '  john@test.com  ',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('John');
    expect(res.body.phone).toBe('+49111');
    expect(res.body.email).toBe('john@test.com');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/trainers')
      .send({ phone: '1', email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name.*required/i);
  });

  it('returns 400 when name is empty string', async () => {
    const res = await request(app)
      .post('/api/trainers')
      .send({ name: '', phone: '1', email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when phone is missing', async () => {
    const res = await request(app)
      .post('/api/trainers')
      .send({ name: 'X', email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/phone.*required/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/trainers')
      .send({ name: 'X', phone: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email.*required/i);
  });

  it('returns 400 for duplicate email', async () => {
    await request(app).post('/api/trainers').send(BASE);
    const res = await request(app)
      .post('/api/trainers')
      .send({ name: 'Other', phone: '+111', email: BASE.email });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe('PUT /api/trainers/:id', () => {
  it('updates all trainer fields', async () => {
    const created = await request(app).post('/api/trainers').send(BASE);
    const res = await request(app)
      .put(`/api/trainers/${created.body.id}`)
      .send({ name: 'Updated Name', phone: '+999', email: 'updated@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.phone).toBe('+999');
    expect(res.body.email).toBe('updated@example.com');
  });

  it('returns 404 for non-existent trainer', async () => {
    const res = await request(app).put('/api/trainers/99999').send(BASE);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when updating to an email already used by another trainer', async () => {
    const a = await request(app).post('/api/trainers').send(BASE);
    const b = await request(app)
      .post('/api/trainers')
      .send({ name: 'B', phone: '2', email: 'b@b.com' });

    const res = await request(app)
      .put(`/api/trainers/${b.body.id}`)
      .send({ name: 'B', phone: '2', email: a.body.email });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('allows updating a trainer to keep its own email', async () => {
    const created = await request(app).post('/api/trainers').send(BASE);
    const res = await request(app)
      .put(`/api/trainers/${created.body.id}`)
      .send({ name: 'New Name', phone: BASE.phone, email: BASE.email });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('returns 400 for empty fields', async () => {
    const created = await request(app).post('/api/trainers').send(BASE);
    const res = await request(app)
      .put(`/api/trainers/${created.body.id}`)
      .send({ name: '', phone: BASE.phone, email: BASE.email });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/trainers/:id', () => {
  it('deletes the trainer and returns a message', async () => {
    const created = await request(app).post('/api/trainers').send(BASE);
    const res = await request(app).delete(`/api/trainers/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 for non-existent trainer', async () => {
    const res = await request(app).delete('/api/trainers/99999');
    expect(res.status).toBe(404);
  });

  it('trainer is gone after deletion', async () => {
    const created = await request(app).post('/api/trainers').send(BASE);
    await request(app).delete(`/api/trainers/${created.body.id}`);
    const res = await request(app).get('/api/trainers');
    expect(res.body).toHaveLength(0);
  });

  it('nullifies trainer_id on courses when trainer is deleted', async () => {
    const group = await request(app)
      .post('/api/dance-groups')
      .send({ name: 'Trainer Cascade Group' });
    const trainer = await request(app).post('/api/trainers').send(BASE);
    const course = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.body.id,
      semester: 'WS 2025',
      trainer_id: trainer.body.id,
    });

    await request(app).delete(`/api/trainers/${trainer.body.id}`);

    const courses = await request(app).get(
      `/api/dance-courses?dance_group_id=${group.body.id}`,
    );
    const updated = courses.body.find((c) => c.id === course.body.id);
    expect(updated.trainer_id).toBeNull();
    expect(updated.trainer_name).toBeNull();
  });
});
