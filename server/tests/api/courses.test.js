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

async function createGroup(name = 'Test Group') {
  const res = await request(app).post('/api/dance-groups').send({ name });
  return res.body;
}

async function createTrainer() {
  const res = await request(app)
    .post('/api/trainers')
    .send({ name: 'Test Trainer', phone: '+49100', email: 'trainer@test.com' });
  return res.body;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/dance-courses', () => {
  it('returns empty array when no courses exist', async () => {
    const res = await request(app).get('/api/dance-courses');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('includes joined dance_group_name', async () => {
    const group = await createGroup('My Dance Group');
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });

    const res = await request(app).get('/api/dance-courses');
    expect(res.body[0].dance_group_name).toBe('My Dance Group');
  });

  it('includes joined trainer fields when a trainer is assigned', async () => {
    const group = await createGroup();
    const trainer = await createTrainer();
    await request(app).post('/api/dance-courses').send({
      dance_group_id: group.id,
      semester: 'WS 2025',
      trainer_id: trainer.id,
    });

    const res = await request(app).get('/api/dance-courses');
    expect(res.body[0].trainer_name).toBe('Test Trainer');
    expect(res.body[0].trainer_phone).toBe('+49100');
    expect(res.body[0].trainer_email).toBe('trainer@test.com');
  });

  it('filters by dance_group_id', async () => {
    const g1 = await createGroup('Group 1');
    const g2 = await createGroup('Group 2');
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: g1.id, semester: 'WS 2025' });
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: g2.id, semester: 'WS 2025' });

    const res = await request(app).get(`/api/dance-courses?dance_group_id=${g1.id}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].dance_group_id).toBe(g1.id);
  });

  it('orders courses by start_date ascending with null dates last', async () => {
    const group = await createGroup();
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'No Date' });
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'Late', start_date: '2025-09-01' });
    await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'Early', start_date: '2024-01-01' });

    const res = await request(app).get(`/api/dance-courses?dance_group_id=${group.id}`);
    expect(res.body[0].semester).toBe('Early');
    expect(res.body[1].semester).toBe('Late');
    expect(res.body[2].semester).toBe('No Date');
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe('POST /api/dance-courses', () => {
  it('creates a course with required fields only', async () => {
    const group = await createGroup();
    const res = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });
    expect(res.status).toBe(201);
    expect(res.body.semester).toBe('WS 2025');
    expect(res.body.dance_group_id).toBe(group.id);
    expect(res.body.trainer_id).toBeNull();
  });

  it('creates a course with all optional fields', async () => {
    const group = await createGroup();
    const trainer = await createTrainer();
    const res = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.id,
      semester: 'SS 2025',
      start_date: '2025-04-01',
      youtube_playlist_url: 'https://youtube.com/list',
      copperknob_list_url: 'https://copperknob.com/list',
      spotify_playlist_url: 'https://spotify.com/list',
      trainer_id: trainer.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.start_date).toBe('2025-04-01');
    expect(res.body.youtube_playlist_url).toBe('https://youtube.com/list');
    expect(res.body.copperknob_list_url).toBe('https://copperknob.com/list');
    expect(res.body.spotify_playlist_url).toBe('https://spotify.com/list');
    expect(res.body.trainer_id).toBe(trainer.id);
    expect(res.body.trainer_name).toBe('Test Trainer');
  });

  it('allows creating a course with a specific custom numeric id', async () => {
    const group = await createGroup();
    const res = await request(app).post('/api/dance-courses').send({
      id: 42,
      dance_group_id: group.id,
      semester: 'Custom ID Semester',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(42);
  });

  it('returns 400 when dance_group_id is missing', async () => {
    const res = await request(app)
      .post('/api/dance-courses')
      .send({ semester: 'WS 2025' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when semester is missing', async () => {
    const group = await createGroup();
    const res = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 404 for a non-existent dance group', async () => {
    const res = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: 99999, semester: 'WS 2025' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/dance group not found/i);
  });

  it('returns 404 for a non-existent trainer_id', async () => {
    const group = await createGroup();
    const res = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.id,
      semester: 'WS 2025',
      trainer_id: 99999,
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/trainer not found/i);
  });

  it('treats empty string trainer_id as null (no trainer)', async () => {
    const group = await createGroup();
    const res = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.id,
      semester: 'WS 2025',
      trainer_id: '',
    });
    expect(res.status).toBe(201);
    expect(res.body.trainer_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe('PUT /api/dance-courses/:id', () => {
  it('updates semester and start_date', async () => {
    const group = await createGroup();
    const created = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'Original' });

    const res = await request(app)
      .put(`/api/dance-courses/${created.body.id}`)
      .send({ semester: 'Updated', start_date: '2025-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.semester).toBe('Updated');
    expect(res.body.start_date).toBe('2025-01-01');
  });

  it('can assign a trainer to a course that has none', async () => {
    const group = await createGroup();
    const trainer = await createTrainer();
    const created = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });

    const res = await request(app)
      .put(`/api/dance-courses/${created.body.id}`)
      .send({ semester: 'WS 2025', trainer_id: trainer.id });
    expect(res.status).toBe(200);
    expect(res.body.trainer_id).toBe(trainer.id);
    expect(res.body.trainer_name).toBe('Test Trainer');
  });

  it('can remove a trainer from a course by passing null', async () => {
    const group = await createGroup();
    const trainer = await createTrainer();
    const created = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.id,
      semester: 'WS 2025',
      trainer_id: trainer.id,
    });

    const res = await request(app)
      .put(`/api/dance-courses/${created.body.id}`)
      .send({ semester: 'WS 2025', trainer_id: null });
    expect(res.status).toBe(200);
    expect(res.body.trainer_id).toBeNull();
    expect(res.body.trainer_name).toBeNull();
  });

  it('can clear playlist URLs by passing null/empty', async () => {
    const group = await createGroup();
    const created = await request(app).post('/api/dance-courses').send({
      dance_group_id: group.id,
      semester: 'WS 2025',
      youtube_playlist_url: 'https://youtube.com',
    });

    const res = await request(app)
      .put(`/api/dance-courses/${created.body.id}`)
      .send({ semester: 'WS 2025', youtube_playlist_url: null });
    expect(res.status).toBe(200);
    expect(res.body.youtube_playlist_url).toBeNull();
  });

  it('returns 404 for non-existent course', async () => {
    const res = await request(app)
      .put('/api/dance-courses/99999')
      .send({ semester: 'WS 2025' });
    expect(res.status).toBe(404);
  });

  it('returns 404 when updating to a non-existent trainer', async () => {
    const group = await createGroup();
    const created = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });

    const res = await request(app)
      .put(`/api/dance-courses/${created.body.id}`)
      .send({ semester: 'WS 2025', trainer_id: 99999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/trainer not found/i);
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/dance-courses/:id', () => {
  it('deletes a course successfully', async () => {
    const group = await createGroup();
    const created = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });

    const res = await request(app).delete(`/api/dance-courses/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 for non-existent course', async () => {
    const res = await request(app).delete('/api/dance-courses/99999');
    expect(res.status).toBe(404);
  });

  it('cascades deletion to sessions when course is deleted', async () => {
    const group = await createGroup();
    const course = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });

    await request(app)
      .post('/api/sessions')
      .send({ dance_course_id: course.body.id, session_date: '2025-01-15' });

    await request(app).delete(`/api/dance-courses/${course.body.id}`);

    const sessions = await request(app).get(
      `/api/sessions?dance_course_id=${course.body.id}`,
    );
    expect(sessions.body).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

describe('GET /api/dance-courses/:id/export-pdf', () => {
  it('returns 200 with PDF headers for an existing course', async () => {
    const group = await createGroup('PDF Group');
    const course = await request(app)
      .post('/api/dance-courses')
      .send({ dance_group_id: group.id, semester: 'WS 2025' });

    const res = await request(app).get(`/api/dance-courses/${course.body.id}/export-pdf`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment;');
    expect(res.headers['content-disposition']).toContain('.pdf');
  });

  it('returns 404 for non-existent course id', async () => {
    const res = await request(app).get('/api/dance-courses/99999/export-pdf');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
