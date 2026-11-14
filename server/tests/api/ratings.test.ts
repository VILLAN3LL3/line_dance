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

async function createChoreo(overrides: Record<string, unknown> = {}): Promise<{ id: number }> {
  const res = await request(app)
    .post('/api/choreographies')
    .send({ name: 'Test Dance', level: 'BEGINNER', ...overrides });
  return res.body;
}

// ---------------------------------------------------------------------------
// GET /api/choreographies/:id — rating field
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/:id — rating field', () => {
  it('returns null rating when no rating has been set', async () => {
    const { id } = await createChoreo();
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.rating).toBeNull();
  });

  it('returns the rating after it has been set', async () => {
    const { id } = await createChoreo();
    await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 4 });
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body.rating).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/choreographies/:id/rating
// ---------------------------------------------------------------------------

describe('PUT /api/choreographies/:id/rating', () => {
  it('sets a rating and returns it', async () => {
    const { id } = await createChoreo();
    const res = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 3 });
    expect(res.status).toBe(200);
    expect(res.body.choreography_id).toBe(id);
    expect(res.body.rating).toBe(3);
  });

  it('allows rating of 0', async () => {
    const { id } = await createChoreo();
    const res = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 0 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(0);
  });

  it('allows rating of 5', async () => {
    const { id } = await createChoreo();
    const res = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
  });

  it('updates an existing rating', async () => {
    const { id } = await createChoreo();
    await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 2 });
    const res = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
  });

  it('rejects a rating above 5', async () => {
    const { id } = await createChoreo();
    const res = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it('rejects a negative rating', async () => {
    const { id } = await createChoreo();
    const res = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: -1 });
    expect(res.status).toBe(400);
  });

  it('rejects a non-numeric rating', async () => {
    const { id } = await createChoreo();
    const res = await request(app)
      .put(`/api/choreographies/${id}/rating`)
      .send({ rating: 'great' });
    expect(res.status).toBe(400);
  });

  it('preserves accepted coercions and rejects invalid JSON values', async () => {
    const { id } = await createChoreo();
    const decimal = await request(app)
      .put(`/api/choreographies/${id}/rating`)
      .send({ rating: '2.5' });
    expect(decimal.status).toBe(200);
    expect(decimal.body.rating).toBe(2);
    const array = await request(app)
      .put(`/api/choreographies/${id}/rating`)
      .send({ rating: [3] });
    expect(array.status).toBe(200);
    expect(array.body.rating).toBe(3);
    const invalid = await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: {} });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: 'Rating must be an integer between 0 and 5' });
  });

  it('returns 404 for a non-existent choreography', async () => {
    const res = await request(app).put('/api/choreographies/99999/rating').send({ rating: 3 });
    expect(res.status).toBe(404);
  });

  it('checks choreography existence before validating the rating', async () => {
    const res = await request(app).put('/api/choreographies/99999/rating').send({ rating: 6 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Choreography not found' });
  });

  it('defers rating conversion errors until after ID and existence checks', async () => {
    const body = { rating: { toString: null } };
    const invalidId = await request(app).put('/api/choreographies/invalid/rating').send(body);
    expect(invalidId.status).toBe(400);
    expect(invalidId.body).toEqual({ error: 'Invalid choreography id' });

    const missing = await request(app).put('/api/choreographies/99999/rating').send(body);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Choreography not found' });

    const { id } = await createChoreo();
    const existing = await request(app).put(`/api/choreographies/${id}/rating`).send(body);
    expect(existing.status).toBe(500);
    expect(existing.body).toEqual({ error: 'Failed to save rating' });
  });

  it('preserves error precedence when deeply nested ratings overflow conversion', async () => {
    const body = `{"rating":${'['.repeat(15000)}3${']'.repeat(15000)}}`;
    const invalidId = await request(app)
      .put('/api/choreographies/invalid/rating')
      .type('json')
      .send(body);
    expect(invalidId.status).toBe(400);
    expect(invalidId.body).toEqual({ error: 'Invalid choreography id' });

    const { id } = await createChoreo();
    const existing = await request(app)
      .put(`/api/choreographies/${id}/rating`)
      .type('json')
      .send(body);
    expect(existing.status).toBe(500);
    expect(existing.body).toEqual({ error: 'Failed to save rating' });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/choreographies/:id/rating
// ---------------------------------------------------------------------------

describe('DELETE /api/choreographies/:id/rating', () => {
  it('removes the rating and returns null when fetched again', async () => {
    const { id } = await createChoreo();
    await request(app).put(`/api/choreographies/${id}/rating`).send({ rating: 4 });
    const del = await request(app).delete(`/api/choreographies/${id}/rating`);
    expect(del.status).toBe(200);
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body.rating).toBeNull();
  });

  it('succeeds even if no rating was set', async () => {
    const { id } = await createChoreo();
    const res = await request(app).delete(`/api/choreographies/${id}/rating`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/choreographies/search — min_rating filter
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — min_rating filter', () => {
  it('returns all choreographies when min_rating is not set', async () => {
    const a = await createChoreo({ name: 'A' });
    await createChoreo({ name: 'B' });
    await request(app).put(`/api/choreographies/${a.id}/rating`).send({ rating: 2 });
    // B has no rating

    const res = await request(app).get('/api/choreographies/search');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by minimum rating', async () => {
    const a = await createChoreo({ name: 'A' });
    const b = await createChoreo({ name: 'B' });
    await createChoreo({ name: 'C' });
    await request(app).put(`/api/choreographies/${a.id}/rating`).send({ rating: 5 });
    await request(app).put(`/api/choreographies/${b.id}/rating`).send({ rating: 3 });
    // C has no rating (treated as 0)

    const res = await request(app).get('/api/choreographies/search?min_rating=4');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(a.id);
  });

  it('includes choreographies with exactly the minimum rating', async () => {
    const a = await createChoreo({ name: 'A' });
    await request(app).put(`/api/choreographies/${a.id}/rating`).send({ rating: 3 });

    const res = await request(app).get('/api/choreographies/search?min_rating=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('excludes choreographies with no rating when min_rating >= 1', async () => {
    const a = await createChoreo({ name: 'A' });
    await createChoreo({ name: 'B' });
    await request(app).put(`/api/choreographies/${a.id}/rating`).send({ rating: 3 });
    // B has no rating

    const res = await request(app).get('/api/choreographies/search?min_rating=1');
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { id: number }) => c.id)).toEqual([a.id]);
  });

  it('returns all choreographies when min_rating=0', async () => {
    const a = await createChoreo({ name: 'A' });
    await createChoreo({ name: 'B' });
    await request(app).put(`/api/choreographies/${a.id}/rating`).send({ rating: 2 });

    const res = await request(app).get('/api/choreographies/search?min_rating=0');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});
