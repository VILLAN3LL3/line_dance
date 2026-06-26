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

// ---------------------------------------------------------------------------
// Step Figure Suggestions
// ---------------------------------------------------------------------------

async function seedChoreo(name, level, stepFigures) {
  return request(app)
    .post('/api/choreographies')
    .send({ name, level, count: 32, authors: [], tags: [], step_figures: stepFigures });
}

describe('GET /api/dance-groups/:groupId/step-figure-suggestions', () => {
  it('returns empty array for group with no choreography data at all', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Empty Group' });
    const res = await request(app).get(
      `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns suggestions even when group has no learned choreographies (beginner group)', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'New Group' });
    await seedChoreo('One Step Dance', 'BEGINNER', ['Basic Step']);
    await seedChoreo('Two Step Dance', 'BEGINNER', ['Basic Step', 'Extra Step']);

    const res = await request(app).get(
      `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
    );
    expect(res.status).toBe(200);
    // 'One Step Dance' has 1 step figure → Basic Step is a valid suggestion
    expect(res.body.some((s) => s.step_figure === 'Basic Step')).toBe(true);
  });

  it('suggests step figures that unlock the most choreographies', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Learned Group' });
    const course = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.body.id, semester: 'WS 2024' });
    const session = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.body.id, session_date: '2020-01-01' });

    const foundation = await seedChoreo('Foundation Dance', 'BEGINNER', ['Foundation']);
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: session.body.id, choreography_id: foundation.body.id });

    // Two dances unlocked by Vine
    await seedChoreo('Vine Dance 1', 'BEGINNER', ['Foundation', 'Vine']);
    await seedChoreo('Vine Dance 2', 'BEGINNER', ['Foundation', 'Vine']);
    // One dance unlocked by Cross
    await seedChoreo('Cross Dance', 'BEGINNER', ['Foundation', 'Cross']);

    const res = await request(app).get(
      `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
    );
    expect(res.status).toBe(200);
    expect(res.body[0].step_figure).toBe('Vine');
    expect(res.body[0].additional_choreographies).toBe(2);
    expect(res.body[1].step_figure).toBe('Cross');
    expect(res.body[1].additional_choreographies).toBe(1);
  });

  it('excludes step figures already known by the group', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Known Group' });
    const course = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.body.id, semester: 'WS 2024' });
    const session = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.body.id, session_date: '2020-01-01' });

    const known = await seedChoreo('Known Dance', 'BEGINNER', ['Known Step', 'Other Step']);
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: session.body.id, choreography_id: known.body.id });

    const res = await request(app).get(
      `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
    );
    expect(res.status).toBe(200);
    expect(res.body.every((s) => s.step_figure !== 'Known Step')).toBe(true);
    expect(res.body.every((s) => s.step_figure !== 'Other Step')).toBe(true);
  });

  it('respects max_level_value filter', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Level Group' });
    const course = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.body.id, semester: 'SS 2024' });
    const session = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.body.id, session_date: '2020-01-01' });

    const base = await seedChoreo('Base Dance', 'BEGINNER', ['Base Step']);
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: session.body.id, choreography_id: base.body.id });

    await seedChoreo('Advanced Dance', 'ADVANCED', ['Base Step', 'Advanced Move']);
    await seedChoreo('Beginner Dance', 'BEGINNER', ['Base Step', 'Easy Move']);

    const levelsRes = await request(app).get('/api/levels');
    const beginnerValue = levelsRes.body.find((l) => l.name === 'BEGINNER')?.value;

    const res = await request(app).get(
      `/api/dance-groups/${group.body.id}/step-figure-suggestions?max_level_value=${beginnerValue}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.some((s) => s.step_figure === 'Easy Move')).toBe(true);
    expect(res.body.every((s) => s.step_figure !== 'Advanced Move')).toBe(true);
  });

  it('limits results to at most 5 suggestions', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Limit Group' });
    const course = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.body.id, semester: 'WS 2023' });
    const session = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.body.id, session_date: '2020-01-01' });

    const common = await seedChoreo('Common Dance', 'BEGINNER', ['Common Step']);
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: session.body.id, choreography_id: common.body.id });

    for (let i = 1; i <= 7; i++) {
      await seedChoreo(`Figure Dance ${i}`, 'BEGINNER', ['Common Step', `Unique Figure ${i}`]);
    }

    const res = await request(app).get(
      `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
    );
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  it('returns 404 for non-existent group', async () => {
    const res = await request(app).get('/api/dance-groups/99999/step-figure-suggestions');
    expect(res.status).toBe(404);
  });
});
