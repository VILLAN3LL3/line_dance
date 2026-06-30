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

async function seedChoreo(name, level, authors) {
  return request(app)
    .post('/api/choreographies')
    .send({ name, level, authors, tags: [], step_figures: [] });
}

describe('GET /api/authors/stats', () => {
  it('returns an empty array when no choreographies exist', async () => {
    const res = await request(app).get('/api/authors/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns total count per author', async () => {
    await seedChoreo('Dance A', 'Beginner', ['Alice']);
    await seedChoreo('Dance B', 'Beginner', ['Alice']);
    await seedChoreo('Dance C', 'Beginner', ['Bob']);

    const res = await request(app).get('/api/authors/stats');
    expect(res.status).toBe(200);

    const alice = res.body.find((r) => r.name === 'Alice');
    const bob = res.body.find((r) => r.name === 'Bob');
    expect(alice.total).toBe(2);
    expect(bob.total).toBe(1);
  });

  it('breaks down counts by level', async () => {
    await seedChoreo('Beginner Dance 1', 'Beginner', ['Alice']);
    await seedChoreo('Beginner Dance 2', 'Beginner', ['Alice']);
    await seedChoreo('Advanced Dance', 'Advanced', ['Alice']);

    const res = await request(app).get('/api/authors/stats');
    const alice = res.body.find((r) => r.name === 'Alice');
    expect(alice.total).toBe(3);
    // Migration 005 canonicalises level names to all-caps
    const beginnerKey = Object.keys(alice.by_level).find((k) => k.toUpperCase() === 'BEGINNER');
    const advancedKey = Object.keys(alice.by_level).find((k) => k.toUpperCase() === 'ADVANCED');
    expect(alice.by_level[beginnerKey]).toBe(2);
    expect(alice.by_level[advancedKey]).toBe(1);
  });

  it('counts correctly when one choreography has multiple authors', async () => {
    await seedChoreo('Collab Dance', 'Beginner', ['Alice', 'Bob']);

    const res = await request(app).get('/api/authors/stats');
    const alice = res.body.find((r) => r.name === 'Alice');
    const bob = res.body.find((r) => r.name === 'Bob');
    expect(alice.total).toBe(1);
    expect(bob.total).toBe(1);
  });

  it('returns { name, total, by_level } shape for each entry', async () => {
    await seedChoreo('Shape Dance', 'Beginner', ['Alice']);

    const res = await request(app).get('/api/authors/stats');
    expect(res.body[0]).toMatchObject({
      name: expect.any(String),
      total: expect.any(Number),
      by_level: expect.any(Object),
    });
  });
});
