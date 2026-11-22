import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupChoreographyTestDb, clearChoreographyTables } from '../setup/testChoreographyDb.ts';
import app from '../setup/testChoreographyApp.ts';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

type Dance = { id: number };
type SearchBody = { data: { name: string; level: string }[] };

async function createChoreo(overrides: Record<string, unknown> = {}): Promise<Dance> {
  const res = await request(app)
    .post('/api/choreographies')
    .send({ name: 'Test Dance', level: 'BEGINNER', ...overrides });
  return res.body;
}

async function setPersonalLevel(id: number, level: unknown): Promise<request.Response> {
  // PUT replaces the catalog fields, so the current name has to be sent along.
  const current = await request(app).get(`/api/choreographies/${id}`);
  return request(app)
    .put(`/api/choreographies/${id}`)
    .send({ name: current.body.name ?? 'Test Dance', personal_level: level });
}

async function searchNames(params: Record<string, string | number | boolean>): Promise<string[]> {
  const res = await request(app).get('/api/choreographies/search').query(params);
  return (res.body as SearchBody).data.map((dance) => dance.name).sort();
}

async function levelValue(name: string): Promise<number> {
  const res = await request(app).get('/api/levels');
  return res.body.find((level: { name: string }) => level.name === name).value;
}

describe('choreography levels — official, personal and effective', () => {
  it('uses the official level as effective level when no personal level exists', async () => {
    const { id } = await createChoreo({ level: 'BEGINNER' });
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body).toMatchObject({
      level: 'BEGINNER',
      official_level: 'BEGINNER',
      personal_level: null,
    });
  });

  it('reports the personal level as effective level and keeps the official one', async () => {
    const { id } = await createChoreo({ level: 'BEGINNER' });
    await setPersonalLevel(id, 'Improver');
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body).toMatchObject({
      level: 'IMPROVER',
      official_level: 'BEGINNER',
      personal_level: 'IMPROVER',
    });
  });
});

describe('personal level in POST /api/choreographies', () => {
  it('saves the personal level with its canonical name', async () => {
    const { id } = await createChoreo({ personal_level: 'advanced' });
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body).toMatchObject({ level: 'ADVANCED', personal_level: 'ADVANCED' });
  });

  it('rejects an unknown personal level as a field issue and creates nothing', async () => {
    const res = await request(app)
      .post('/api/choreographies')
      .send({ name: 'Test Dance', level: 'BEGINNER', personal_level: 'Not A Level' });
    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual([{ field: 'personal_level', key: 'invalid_level' }]);
    const list = await request(app).get('/api/choreographies');
    expect(list.body.data).toHaveLength(0);
  });

  it('reports the same issue from the validate endpoint', async () => {
    const res = await request(app)
      .post('/api/choreographies/validate')
      .send({ name: 'Test Dance', level: 'BEGINNER', personal_level: 'Not A Level' });
    expect(res.status).toBe(400);
    expect(res.body.issues).toContainEqual({ field: 'personal_level', key: 'invalid_level' });
  });
});

describe('personal level in PUT /api/choreographies/:id', () => {
  it('sets and overwrites the personal level', async () => {
    const { id } = await createChoreo();
    expect((await setPersonalLevel(id, 'ADVANCED')).status).toBe(200);
    await setPersonalLevel(id, 'INTERMEDIATE');
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body.personal_level).toBe('INTERMEDIATE');
  });

  it('keeps the personal level when the request does not mention it', async () => {
    const { id } = await createChoreo({ personal_level: 'ADVANCED' });
    await request(app).put(`/api/choreographies/${id}`).send({ name: 'Renamed' });
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body).toMatchObject({ name: 'Renamed', personal_level: 'ADVANCED' });
  });

  it.each([[null], ['']])('resets to the official level for %j', async (value) => {
    const { id } = await createChoreo({ level: 'BEGINNER', personal_level: 'ADVANCED' });
    expect((await setPersonalLevel(id, value)).status).toBe(200);
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body).toMatchObject({ level: 'BEGINNER', personal_level: null });
  });

  it('changes the official level without touching the personal level', async () => {
    const { id } = await createChoreo({ level: 'BEGINNER', personal_level: 'ADVANCED' });
    await request(app)
      .put(`/api/choreographies/${id}`)
      .send({ name: 'Test Dance', level: 'IMPROVER' });
    const res = await request(app).get(`/api/choreographies/${id}`);
    expect(res.body).toMatchObject({
      level: 'ADVANCED',
      official_level: 'IMPROVER',
      personal_level: 'ADVANCED',
    });
  });

  it.each([['Not A Level'], [42]])(
    'returns a field issue for the invalid level %j and changes nothing',
    async (level) => {
      const { id } = await createChoreo({ personal_level: 'ADVANCED' });
      const res = await request(app)
        .put(`/api/choreographies/${id}`)
        .send({ name: 'Renamed', personal_level: level });
      expect(res.status).toBe(400);
      expect(res.body.issues).toEqual([{ field: 'personal_level', key: 'invalid_level' }]);
      const after = await request(app).get(`/api/choreographies/${id}`);
      expect(after.body).toMatchObject({ name: 'Test Dance', personal_level: 'ADVANCED' });
    },
  );

  it('returns 404 for an unknown choreography', async () => {
    const res = await setPersonalLevel(999, 'ADVANCED');
    expect(res.status).toBe(404);
  });
});

describe('search — level filters use the effective level', () => {
  it('matches the personal level instead of the official level', async () => {
    const { id } = await createChoreo({ name: 'Moved Up', level: 'BEGINNER' });
    await createChoreo({ name: 'Stays', level: 'BEGINNER' });
    await setPersonalLevel(id, 'ADVANCED');

    expect(await searchNames({ level: 'Advanced' })).toEqual(['Moved Up']);
    expect(await searchNames({ level: 'Beginner' })).toEqual(['Stays']);
  });

  it('applies max_level_value to the personal level', async () => {
    const { id } = await createChoreo({ name: 'Moved Up', level: 'BEGINNER' });
    await createChoreo({ name: 'Stays', level: 'BEGINNER' });
    await setPersonalLevel(id, 'ADVANCED');

    expect(await searchNames({ max_level_value: await levelValue('BEGINNER') })).toEqual(['Stays']);
  });

  it('filters on the official level when use_official_level is set', async () => {
    const { id } = await createChoreo({ name: 'Moved Up', level: 'BEGINNER' });
    await setPersonalLevel(id, 'ADVANCED');

    expect(await searchNames({ level: 'Beginner', use_official_level: true })).toEqual([
      'Moved Up',
    ]);
    expect(await searchNames({ level: 'Advanced', use_official_level: true })).toEqual([]);
  });

  it('combines the effective level with other filters', async () => {
    const { id } = await createChoreo({ name: 'Waltz', level: 'BEGINNER', authors: ['Alice'] });
    await createChoreo({ name: 'Tango', level: 'ADVANCED', authors: ['Bob'] });
    await setPersonalLevel(id, 'ADVANCED');

    expect(await searchNames({ level: 'Advanced', authors: 'Alice' })).toEqual(['Waltz']);
  });

  it('returns the effective level in the search results without duplicating rows', async () => {
    const { id } = await createChoreo({ name: 'Moved Up', level: 'BEGINNER' });
    await setPersonalLevel(id, 'ADVANCED');
    const res = await request(app).get('/api/choreographies/search');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].level).toBe('ADVANCED');
  });
});

describe('author statistics use the effective level', () => {
  it('counts a choreography under its personal level', async () => {
    const { id } = await createChoreo({ level: 'BEGINNER', authors: ['Alice'] });
    await setPersonalLevel(id, 'ADVANCED');
    const res = await request(app).get('/api/authors/stats');
    const alice = res.body.find((row: { name: string }) => row.name === 'Alice');
    expect(alice.by_level).toEqual({ ADVANCED: 1 });
  });
});

describe('cleanup of personal levels', () => {
  it('removes the personal level when the choreography is deleted', async () => {
    const { id } = await createChoreo();
    await setPersonalLevel(id, 'ADVANCED');
    await request(app).delete(`/api/choreographies/${id}`);

    const created = await createChoreo({ name: 'Other' });
    const res = await request(app).get(`/api/choreographies/${created.id}`);
    expect(res.body.personal_level).toBeNull();
  });

  it('keeps a custom level that is only used as personal level', async () => {
    await request(app).post('/api/levels').send({ name: 'Custom Level' });
    const { id } = await createChoreo({ level: 'BEGINNER' });
    expect((await setPersonalLevel(id, 'Custom Level')).status).toBe(200);

    // Updates and deletes trigger the cleanup of unused levels.
    await request(app).put(`/api/choreographies/${id}`).send({ name: 'Renamed' });

    const levels = await request(app).get('/api/levels');
    expect(levels.body.map((level: { name: string }) => level.name)).toContain('Custom Level');
  });
});
