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
// Helpers
// ---------------------------------------------------------------------------

async function createGroupAndCourse(groupName = 'Session Test Group') {
  const group = await request(app).post('/api/dance-groups').send({ name: groupName });
  const course = await request(app).post('/api/dance-courses').send({
    dance_group_id: group.body.id,
    semester: 'WS 2025',
  });
  return { group: group.body, course: course.body };
}

// ---------------------------------------------------------------------------
// Sessions CRUD
// ---------------------------------------------------------------------------

describe('GET /api/sessions', () => {
  it('returns empty array when no sessions exist', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns sessions with joined course and group data', async () => {
    const { course } = await createGroupAndCourse();
    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });

    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].dance_group_name).toBe('Session Test Group');
    expect(res.body[0].semester).toBe('WS 2025');
    expect(res.body[0].dance_course_id).toBe(course.id);
  });

  it('filters sessions by dance_course_id', async () => {
    const { course: c1 } = await createGroupAndCourse('Group 1');
    const { course: c2 } = await createGroupAndCourse('Group 2');

    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: c1.id, session_date: '2025-01-01' });
    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: c2.id, session_date: '2025-02-01' });

    const res = await request(app).get(`/api/sessions?dance_course_id=${c1.id}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].dance_course_id).toBe(c1.id);
  });

  it('returns sessions ordered by date ascending', async () => {
    const { course } = await createGroupAndCourse();
    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-03-01' });
    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-01' });
    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-02-01' });

    const res = await request(app).get(`/api/sessions?dance_course_id=${course.id}`);
    expect(res.body[0].session_date).toBe('2025-01-01');
    expect(res.body[1].session_date).toBe('2025-02-01');
    expect(res.body[2].session_date).toBe('2025-03-01');
  });
});

describe('POST /api/sessions', () => {
  it('creates a session and returns 201', async () => {
    const { course } = await createGroupAndCourse();
    const res = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.session_date).toBe('2025-01-15');
    expect(res.body.dance_course_id).toBe(course.id);
  });

  it('returns 400 when dance_course_id is missing', async () => {
    const res = await request(app).post('/api/sessions').send({ session_date: '2025-01-15' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when session_date is missing', async () => {
    const { course } = await createGroupAndCourse();
    const res = await request(app).post('/api/sessions').send({ dance_course_id: course.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 404 for a non-existent course', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: 99999, session_date: '2025-01-15' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/dance course not found/i);
  });
});

describe('PUT /api/sessions/:id', () => {
  it('updates the session date', async () => {
    const { course } = await createGroupAndCourse();
    const created = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });

    const res = await request(app)
      .put(`/api/sessions/${created.body.id}`)
      .send({ session_date: '2025-02-20' });
    expect(res.status).toBe(200);
    expect(res.body.session_date).toBe('2025-02-20');
  });

  it('returns 404 for non-existent session', async () => {
    const res = await request(app).put('/api/sessions/99999').send({ session_date: '2025-01-15' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when session_date is missing', async () => {
    const { course } = await createGroupAndCourse();
    const created = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });

    const res = await request(app).put(`/api/sessions/${created.body.id}`).send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes a session', async () => {
    const { course } = await createGroupAndCourse();
    const created = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });

    const res = await request(app).delete(`/api/sessions/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 for non-existent session', async () => {
    const res = await request(app).delete('/api/sessions/99999');
    expect(res.status).toBe(404);
  });

  it('cascades to session_choreographies', async () => {
    const { course } = await createGroupAndCourse();
    const session = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: session.body.id, choreography_id: 42 });

    await request(app).delete(`/api/sessions/${session.body.id}`);

    const res = await request(app).get(`/api/session-choreographies?session_id=${session.body.id}`);
    expect(res.body).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Session Choreographies
// ---------------------------------------------------------------------------

describe('Session Choreographies API', () => {
  let session;

  beforeEach(async () => {
    const { course } = await createGroupAndCourse('SC Group');
    const res = await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.id, session_date: '2025-01-15' });
    session = res.body;
  });

  describe('GET /api/session-choreographies', () => {
    it('returns 400 when session_id is not provided', async () => {
      const res = await request(app).get('/api/session-choreographies');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/session id.*required/i);
    });

    it('returns empty array for a session with no choreographies', async () => {
      const res = await request(app).get(`/api/session-choreographies?session_id=${session.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns choreographies linked to the session', async () => {
      await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id, choreography_id: 101 });

      const res = await request(app).get(`/api/session-choreographies?session_id=${session.id}`);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].choreography_id).toBe(101);
    });
  });

  describe('POST /api/session-choreographies', () => {
    it('adds a choreography to a session', async () => {
      const res = await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id, choreography_id: 42 });
      expect(res.status).toBe(201);
      expect(res.body.choreography_id).toBe(42);
      expect(res.body.session_id).toBe(session.id);
    });

    it('returns 400 when adding the same choreography twice to one session', async () => {
      await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id, choreography_id: 42 });
      const res = await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id, choreography_id: 42 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already added/i);
    });

    it('allows the same choreography_id in different sessions', async () => {
      const { course } = await createGroupAndCourse('Other Group');
      const session2 = await request(app)
        .post('/api/sessions')
        .send({ dance_course_id: course.id, session_date: '2025-02-01' });

      await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id, choreography_id: 42 });

      const res = await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session2.body.id, choreography_id: 42 });
      expect(res.status).toBe(201);
    });

    it('returns 400 when session_id is missing', async () => {
      const res = await request(app)
        .post('/api/session-choreographies')
        .send({ choreography_id: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 when choreography_id is missing', async () => {
      const res = await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 404 for a non-existent session', async () => {
      const res = await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: 99999, choreography_id: 1 });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/session not found/i);
    });
  });

  describe('DELETE /api/session-choreographies/:id', () => {
    it('removes a choreography entry', async () => {
      const added = await request(app)
        .post('/api/session-choreographies')
        .send({ session_id: session.id, choreography_id: 42 });

      const res = await request(app).delete(`/api/session-choreographies/${added.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed/i);
    });

    it('returns 404 for a non-existent entry', async () => {
      const res = await request(app).delete('/api/session-choreographies/99999');
      expect(res.status).toBe(404);
    });
  });
});

// ---------------------------------------------------------------------------
// Learned Choreographies view
// ---------------------------------------------------------------------------

describe('GET /api/learned-choreographies', () => {
  it('returns learned choreographies for a group with past sessions', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Learned Group' });
    const course = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.body.id,
      semester: 'WS 2024',
    });
    const session = await request(app).post('/api/sessions').send({
      dance_course_id: course.body.id,
      session_date: '2020-01-01', // definitely in the past
    });
    await request(app).post('/api/session-choreographies').send({
      session_id: session.body.id,
      choreography_id: 555,
    });

    const res = await request(app).get(
      `/api/learned-choreographies?dance_group_id=${group.body.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].choreography_id).toBe(555);
    expect(res.body[0].dance_group_id).toBe(group.body.id);
    expect(Number(res.body[0].times_danced)).toBe(1);
    expect(res.body[0].first_learned_date).toBe('2020-01-01');
  });

  it('counts multiple sessions for the same choreography in one group', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Count Group' });
    const course = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.body.id,
      semester: 'WS 2024',
    });
    const s1 = await request(app).post('/api/sessions').send({
      dance_course_id: course.body.id,
      session_date: '2020-01-01',
    });
    const s2 = await request(app).post('/api/sessions').send({
      dance_course_id: course.body.id,
      session_date: '2020-02-01',
    });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: s1.body.id, choreography_id: 77 });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: s2.body.id, choreography_id: 77 });

    const res = await request(app).get(
      `/api/learned-choreographies?dance_group_id=${group.body.id}`,
    );
    expect(res.body[0].choreography_id).toBe(77);
    expect(Number(res.body[0].times_danced)).toBe(2);
  });

  it('returns choreography with times_danced = 0 when all sessions are in the future', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Future Group' });
    const course = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.body.id,
      semester: 'WS 2026',
    });
    const futureSession = await request(app).post('/api/sessions').send({
      dance_course_id: course.body.id,
      session_date: '2099-01-01',
    });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: futureSession.body.id, choreography_id: 88 });

    const res = await request(app).get(
      `/api/learned-choreographies?dance_group_id=${group.body.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].choreography_id).toBe(88);
    expect(Number(res.body[0].times_danced)).toBe(0);
    expect(res.body[0].first_learned_date).toBe('2099-01-01');
    expect(res.body[0].last_danced_date).toBe('2099-01-01');
  });

  it('counts only past sessions when a choreography appears in both past and future sessions', async () => {
    const group = await request(app)
      .post('/api/dance-groups')
      .send({ name: 'Mixed Timeline Group' });
    const course = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.body.id,
      semester: 'WS 2026',
    });
    const pastSession = await request(app).post('/api/sessions').send({
      dance_course_id: course.body.id,
      session_date: '2020-01-01',
    });
    const futureSession = await request(app).post('/api/sessions').send({
      dance_course_id: course.body.id,
      session_date: '2099-01-01',
    });

    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: pastSession.body.id, choreography_id: 99 });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: futureSession.body.id, choreography_id: 99 });

    const res = await request(app).get(
      `/api/learned-choreographies?dance_group_id=${group.body.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].choreography_id).toBe(99);
    expect(Number(res.body[0].times_danced)).toBe(1);
    expect(res.body[0].first_learned_date).toBe('2020-01-01');
    expect(res.body[0].last_danced_date).toBe('2099-01-01');
  });

  it('returns empty for a group with no session choreographies', async () => {
    const group = await request(app).post('/api/dance-groups').send({ name: 'Empty Group' });
    const res = await request(app).get(
      `/api/learned-choreographies?dance_group_id=${group.body.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters results to the requested dance_group_id', async () => {
    // Group 1 learns choreography 10
    const g1 = await request(app).post('/api/dance-groups').send({ name: 'Filter G1' });
    const c1 = await request(app).post('/api/dance-courses').send({
      dance_group_id: g1.body.id,
      semester: 'WS 2024',
    });
    const s1 = await request(app).post('/api/sessions').send({
      dance_course_id: c1.body.id,
      session_date: '2020-01-01',
    });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: s1.body.id, choreography_id: 10 });

    // Group 2 learns choreography 20
    const g2 = await request(app).post('/api/dance-groups').send({ name: 'Filter G2' });
    const c2 = await request(app).post('/api/dance-courses').send({
      dance_group_id: g2.body.id,
      semester: 'WS 2024',
    });
    const s2 = await request(app).post('/api/sessions').send({
      dance_course_id: c2.body.id,
      session_date: '2020-01-01',
    });
    await request(app)
      .post('/api/session-choreographies')
      .send({ session_id: s2.body.id, choreography_id: 20 });

    const res = await request(app).get(`/api/learned-choreographies?dance_group_id=${g1.body.id}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].choreography_id).toBe(10);
  });
});
