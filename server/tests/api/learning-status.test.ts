import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupChoreographyTestDb, clearChoreographyTables } from '../setup/testChoreographyDb.ts';
import app from '../setup/testChoreographyApp.ts';
import { allQuery, runQuery } from '../../scripts/db.ts';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

const today = /^\d{4}-\d{2}-\d{2}$/;

async function createChoreo(overrides: Record<string, unknown> = {}): Promise<{ id: number }> {
  const res = await request(app)
    .post('/api/choreographies')
    .send({ name: 'Test Dance', level: 'BEGINNER', ...overrides });
  return res.body;
}

async function getChoreo(id: number): Promise<request.Response> {
  return request(app).get(`/api/choreographies/${id}`);
}

async function searchNames(params: Record<string, string | string[]>): Promise<string[]> {
  const res = await request(app).get('/api/choreographies/search').query(params);
  return (res.body.data as { name: string }[]).map((dance) => dance.name).sort();
}

describe('learning status — reading', () => {
  it('returns null status and date when none is set', async () => {
    const { id } = await createChoreo();
    const res = await getChoreo(id);
    expect(res.body).toMatchObject({ learning_status: null, learning_status_date: null });
  });

  it('includes the status in list and search results', async () => {
    const { id } = await createChoreo();
    await request(app).put(`/api/choreographies/${id}/learning-status`).send({ status: 'learned' });
    const list = await request(app).get('/api/choreographies');
    const search = await request(app).get('/api/choreographies/search');
    expect(list.body.data[0].learning_status).toBe('learned');
    expect(search.body.data[0].learning_status).toBe('learned');
  });
});

describe('PUT /api/choreographies/:id/learning-status', () => {
  it('sets the status and stamps the current day', async () => {
    const { id } = await createChoreo();
    const res = await request(app)
      .put(`/api/choreographies/${id}/learning-status`)
      .send({ status: 'wishlist' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ choreography_id: id, status: 'wishlist' });
    expect(res.body.status_date).toMatch(today);
    expect((await getChoreo(id)).body.learning_status).toBe('wishlist');
  });

  it('keeps the date when the same status is saved again', async () => {
    const { id } = await createChoreo();
    await request(app).put(`/api/choreographies/${id}/learning-status`).send({ status: 'learned' });
    await runQuery(
      "UPDATE personal_data.choreography_learning_status SET status_date = '2020-01-02'",
    );
    const res = await request(app)
      .put(`/api/choreographies/${id}/learning-status`)
      .send({ status: 'learned' });
    expect(res.body.status_date).toBe('2020-01-02');
  });

  it('sets a new date when the status changes', async () => {
    const { id } = await createChoreo();
    await request(app)
      .put(`/api/choreographies/${id}/learning-status`)
      .send({ status: 'wishlist' });
    await runQuery(
      "UPDATE personal_data.choreography_learning_status SET status_date = '2020-01-02'",
    );
    const res = await request(app)
      .put(`/api/choreographies/${id}/learning-status`)
      .send({ status: 'learned' });
    expect(res.body.status).toBe('learned');
    expect(res.body.status_date).toMatch(today);
    expect(res.body.status_date).not.toBe('2020-01-02');
  });

  it('returns 404 for an unknown choreography', async () => {
    const res = await request(app)
      .put('/api/choreographies/9999/learning-status')
      .send({ status: 'learned' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app)
      .put('/api/choreographies/abc/learning-status')
      .send({ status: 'learned' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid choreography id');
  });

  it.each([{ status: 'sure' }, { status: null }, {}, { status: 3 }])(
    'returns 400 for the invalid body %j',
    async (body) => {
      const { id } = await createChoreo();
      const res = await request(app).put(`/api/choreographies/${id}/learning-status`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('wishlist');
      expect((await getChoreo(id)).body.learning_status).toBeNull();
    },
  );
});

describe('DELETE /api/choreographies/:id/learning-status', () => {
  it('removes the status', async () => {
    const { id } = await createChoreo();
    await request(app).put(`/api/choreographies/${id}/learning-status`).send({ status: 'learned' });
    const res = await request(app).delete(`/api/choreographies/${id}/learning-status`);
    expect(res.status).toBe(200);
    expect(await getChoreo(id)).toMatchObject({
      body: { learning_status: null, learning_status_date: null },
    });
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).delete('/api/choreographies/abc/learning-status');
    expect(res.status).toBe(400);
  });
});

describe('learning_status in choreography create and update', () => {
  it('sets the status when creating a choreography', async () => {
    const { id } = await createChoreo({ learning_status: 'wishlist' });
    expect((await getChoreo(id)).body.learning_status).toBe('wishlist');
  });

  it('keeps the stored status and date when the field is omitted', async () => {
    const { id } = await createChoreo({ learning_status: 'learned' });
    await runQuery(
      "UPDATE personal_data.choreography_learning_status SET status_date = '2020-01-02'",
    );
    await request(app).put(`/api/choreographies/${id}`).send({ name: 'Renamed' });
    expect((await getChoreo(id)).body).toMatchObject({
      learning_status: 'learned',
      learning_status_date: '2020-01-02',
    });
  });

  it('keeps the date when an update sends the unchanged status', async () => {
    const { id } = await createChoreo({ learning_status: 'learned' });
    await runQuery(
      "UPDATE personal_data.choreography_learning_status SET status_date = '2020-01-02'",
    );
    await request(app)
      .put(`/api/choreographies/${id}`)
      .send({ name: 'Test Dance', learning_status: 'learned' });
    expect((await getChoreo(id)).body.learning_status_date).toBe('2020-01-02');
  });

  it.each([null, ''])('removes the status for %j', async (value) => {
    const { id } = await createChoreo({ learning_status: 'learned' });
    await request(app)
      .put(`/api/choreographies/${id}`)
      .send({ name: 'Test Dance', learning_status: value });
    expect((await getChoreo(id)).body.learning_status).toBeNull();
  });

  it('reports an invalid status as a field issue without writing anything', async () => {
    const res = await request(app)
      .post('/api/choreographies')
      .send({ name: 'Test Dance', level: 'BEGINNER', learning_status: 'sure' });
    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual([{ field: 'learning_status', key: 'invalid_learning_status' }]);
    const validate = await request(app)
      .post('/api/choreographies/validate')
      .send({ name: 'Test Dance', level: 'BEGINNER', learning_status: 'sure' });
    expect(validate.status).toBe(400);
  });

  it('removes the status together with the choreography', async () => {
    const { id } = await createChoreo({ learning_status: 'learned' });
    await request(app).delete(`/api/choreographies/${id}`);
    expect(await allQuery('SELECT * FROM personal_data.choreography_learning_status')).toEqual([]);
  });
});

describe('GET /api/choreographies/search — learning_status filter', () => {
  beforeEach(async () => {
    await createChoreo({ name: 'Wished', learning_status: 'wishlist' });
    await createChoreo({ name: 'Known', learning_status: 'learned' });
    await createChoreo({ name: 'Untracked' });
  });

  it('returns only dances with the requested status', async () => {
    expect(await searchNames({ learning_status: 'wishlist' })).toEqual(['Wished']);
    expect(await searchNames({ learning_status: 'learned' })).toEqual(['Known']);
  });

  it('is case-insensitive and accepts several statuses', async () => {
    expect(await searchNames({ learning_status: 'LEARNED' })).toEqual(['Known']);
    expect(await searchNames({ learning_status: ['wishlist', 'learned'] })).toEqual([
      'Known',
      'Wished',
    ]);
  });

  it('combines with other filters using AND', async () => {
    expect(await searchNames({ learning_status: 'learned', search: 'wish' })).toEqual([]);
  });

  it('matches nothing for an unknown status', async () => {
    expect(await searchNames({ learning_status: 'unknown' })).toEqual([]);
  });
});
