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

async function createChoreo(name = 'Test Dance'): Promise<number> {
  const res = await request(app).post('/api/choreographies').send({ name, level: 'BEGINNER' });
  return res.body.id;
}

async function levelId(name: string): Promise<number> {
  const rows = await allQuery<{ id: number }>('SELECT id FROM levels WHERE name = ?', [name]);
  return rows[0].id;
}

async function learn(id: number): Promise<void> {
  await request(app).put(`/api/choreographies/${id}/learning-status`).send({ status: 'learned' });
}

describe('POST /api/practice-log', () => {
  it('logs several dances at once and returns 201', async () => {
    const a = await createChoreo('A');
    const b = await createChoreo('B');
    const res = await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [a, b], practiced_on: '2026-01-02', note: ' Restart ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ logged: 2, practiced_on: '2026-01-02' });
    const log = await request(app).get('/api/practice-log');
    expect(log.body.total).toBe(2);
    expect(log.body.data[0]).toMatchObject({ note: 'Restart', confidence: 'sure' });
  });

  it('accepts a past date entered afterwards', async () => {
    const id = await createChoreo();
    const res = await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id], practiced_on: '2020-05-17' });
    expect(res.status).toBe(201);
  });

  it.each([
    [{}, 'choreography_ids'],
    [{ choreography_ids: [] }, 'choreography_ids'],
    [{ choreography_ids: [1], practiced_on: 'yesterday' }, 'practiced_on'],
    [{ choreography_ids: [1], practiced_on: '2999-01-01' }, 'future'],
    [{ choreography_ids: [1], confidence: 'x' }, 'confidence'],
  ])('returns 400 for %j', async (body, hint) => {
    const res = await request(app).post('/api/practice-log').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(hint);
  });

  it('returns 404 and stores nothing if a dance is unknown', async () => {
    const id = await createChoreo();
    const res = await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id, 9999] });
    expect(res.status).toBe(404);
    const rows = await allQuery('SELECT * FROM personal_data.choreography_practice_log');
    expect(rows).toHaveLength(0);
  });
});

describe('GET /api/practice-log paging and filter', () => {
  async function logDays(id: number, days: string[]): Promise<void> {
    await days.reduce(
      (previous, day) =>
        previous.then(async () => {
          await request(app)
            .post('/api/practice-log')
            .send({ choreography_ids: [id], practiced_on: day });
        }),
      Promise.resolve(),
    );
  }

  it('returns the pages newest first with the total number of entries', async () => {
    const id = await createChoreo('Paged');
    await logDays(id, ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']);

    const first = (await request(app).get('/api/practice-log').query({ limit: '2' })).body;
    const second = (await request(app).get('/api/practice-log').query({ limit: '2', offset: '2' }))
      .body;
    const last = (await request(app).get('/api/practice-log').query({ limit: '2', offset: '4' }))
      .body;
    const beyond = (await request(app).get('/api/practice-log').query({ limit: '2', offset: '9' }))
      .body;

    expect(first.total).toBe(5);
    expect(first.data.map((e: { practiced_on: string }) => e.practiced_on)).toEqual([
      '2026-01-05',
      '2026-01-04',
    ]);
    expect(second.data.map((e: { practiced_on: string }) => e.practiced_on)).toEqual([
      '2026-01-03',
      '2026-01-02',
    ]);
    expect(last.data).toHaveLength(1);
    expect(beyond).toEqual({ data: [], total: 5 });
  });

  it('filters by dance name, ignoring case, and counts only matches', async () => {
    const boogie = await createChoreo('Cowboy Boogie');
    const waltz = await createChoreo('Waltz');
    await logDays(boogie, ['2026-01-01', '2026-01-02']);
    await logDays(waltz, ['2026-01-03']);

    const res = await request(app).get('/api/practice-log').query({ q: 'BOOG' });
    expect(res.body.total).toBe(2);
    expect(
      res.body.data.every(
        (e: { choreography_name: string }) => e.choreography_name === 'Cowboy Boogie',
      ),
    ).toBe(true);
    expect((await request(app).get('/api/practice-log').query({ q: 'xyz' })).body).toEqual({
      data: [],
      total: 0,
    });
  });

  it('matches wildcard characters literally', async () => {
    const id = await createChoreo('100% Country');
    const other = await createChoreo('Plain');
    await logDays(id, ['2026-01-01']);
    await logDays(other, ['2026-01-02']);
    expect((await request(app).get('/api/practice-log').query({ q: '%' })).body.total).toBe(1);
    expect((await request(app).get('/api/practice-log').query({ q: '_' })).body.total).toBe(0);
  });

  it.each([{ offset: '-1' }, { offset: 'x' }, { q: 'x'.repeat(101) }])(
    'returns 400 for %j',
    async (query) => {
      expect((await request(app).get('/api/practice-log').query(query)).status).toBe(400);
    },
  );
});

describe('GET /api/practice-log and DELETE /api/practice-log/:id', () => {
  it('rejects an invalid limit', async () => {
    const res = await request(app).get('/api/practice-log').query({ limit: '0' });
    expect(res.status).toBe(400);
  });

  it('deletes an entry, 404 for a missing one, 400 for a bad id', async () => {
    const id = await createChoreo();
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id] });
    const [entry] = (await request(app).get('/api/practice-log')).body.data;
    expect((await request(app).delete(`/api/practice-log/${entry.id}`)).status).toBe(200);
    expect((await request(app).delete(`/api/practice-log/${entry.id}`)).status).toBe(404);
    expect((await request(app).delete('/api/practice-log/abc')).status).toBe(400);
  });

  it('removes entries of a deleted choreography', async () => {
    const id = await createChoreo();
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id] });
    await request(app).delete(`/api/choreographies/${id}`);
    expect((await request(app).get('/api/practice-log')).body).toEqual({ data: [], total: 0 });
    const rows = await allQuery('SELECT * FROM personal_data.choreography_practice_log');
    expect(rows).toHaveLength(0);
  });
});

describe('GET /api/practice/suggestions', () => {
  it('returns an empty list without learned dances', async () => {
    await createChoreo();
    expect((await request(app).get('/api/practice/suggestions')).body).toEqual([]);
  });

  it('lists learned dances with their practice state, due ones first', async () => {
    const old = await createChoreo('Old');
    const recent = await createChoreo('Recent');
    const fresh = await createChoreo('Fresh');
    await Promise.all([old, recent, fresh].map(learn));
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [old], practiced_on: '2020-01-01' });
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [recent] });

    const res = await request(app).get('/api/practice/suggestions');
    expect(res.body.map((s: { choreography_id: number }) => s.choreography_id)).toEqual([
      fresh,
      old,
      recent,
    ]);
    expect(res.body[0]).toMatchObject({ practice_count: 0, is_due: true, last_practiced_on: null });
    expect(res.body[1]).toMatchObject({
      practice_count: 1,
      last_practiced_on: '2020-01-01',
      next_due_on: '2020-01-02',
      is_due: true,
    });
    expect(res.body[2].is_due).toBe(false);
  });

  it('an unsure practice makes the dance due again the next day', async () => {
    const id = await createChoreo();
    await learn(id);
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id], practiced_on: '2020-01-01', confidence: 'sure' });
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id], practiced_on: '2020-01-10', confidence: 'unsure' });
    const [summary] = (await request(app).get('/api/practice/suggestions')).body;
    expect(summary).toMatchObject({ practice_count: 2, next_due_on: '2020-01-11' });
  });
});

describe('level dependent intervals', () => {
  async function dueDateAfterThreeSurePractices(id: number): Promise<string> {
    await learn(id);
    await Promise.all(
      ['2020-01-01', '2020-01-02', '2020-01-03'].map((day) =>
        request(app)
          .post('/api/practice-log')
          .send({ choreography_ids: [id], practiced_on: day }),
      ),
    );
    const res = await request(app).get('/api/practice/suggestions');
    return res.body.find((s: { choreography_id: number }) => s.choreography_id === id).next_due_on;
  }

  it('repeats an advanced dance sooner than a beginner dance', async () => {
    const beginner = await createChoreo('Beginner Dance');
    const advanced = (
      await request(app).post('/api/choreographies').send({ name: 'Advanced', level: 'ADVANCED' })
    ).body.id;
    expect(await dueDateAfterThreeSurePractices(beginner)).toBe('2020-01-07');
    expect(await dueDateAfterThreeSurePractices(advanced)).toBe('2020-01-05');
  });

  it('uses the personal level instead of the official one', async () => {
    const id = await createChoreo('Hard For Me');
    await runQuery(
      'INSERT INTO personal_data.choreography_personal_levels (choreography_id, level_id) VALUES (?, ?)',
      [id, await levelId('ADVANCED')],
    );
    expect(await dueDateAfterThreeSurePractices(id)).toBe('2020-01-05');
  });
});

describe('POST /api/practice/baseline', () => {
  async function learnedDance(name: string): Promise<number> {
    const id = await createChoreo(name);
    await learn(id);
    return id;
  }

  it('sets dances to an interval step with spread due dates', async () => {
    const ids = await Promise.all(['A', 'B', 'C', 'D'].map(learnedDance));
    const res = await request(app)
      .post('/api/practice/baseline')
      .send({ choreography_ids: ids, step: 8 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ updated: 4, step: 8 });

    const suggestions = (await request(app).get('/api/practice/suggestions')).body;
    expect(suggestions).toHaveLength(4);
    expect(suggestions.every((s: { is_due: boolean }) => !s.is_due)).toBe(true);
    const dueDates = suggestions.map((s: { next_due_on: string }) => s.next_due_on);
    expect(new Set(dueDates).size).toBeGreaterThan(1);
  });

  it('continues from the step with the next practice', async () => {
    const id = await learnedDance('A');
    await request(app)
      .post('/api/practice/baseline')
      .send({ choreography_ids: [id], step: 8, spread: false });
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [id] });
    const [summary] = (await request(app).get('/api/practice/suggestions')).body;
    // Step 9 of the beginner ladder: 45 days.
    const expected = new Date();
    expected.setDate(expected.getDate() + 45);
    const pad = (value: number): string => String(value).padStart(2, '0');
    expect(summary.practice_count).toBe(1);
    expect(summary.next_due_on).toBe(
      `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`,
    );
  });

  it('shows the baseline in the log', async () => {
    const id = await learnedDance('A');
    await request(app)
      .post('/api/practice/baseline')
      .send({ choreography_ids: [id], step: 3 });
    const log = (await request(app).get('/api/practice-log')).body.data;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ step: 3, choreography_name: 'A' });
    expect(log[0].due_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each([
    [{ choreography_ids: [1] }, 'step'],
    [{ choreography_ids: [1], step: 0 }, 'step'],
    [{ choreography_ids: [1], step: 15 }, 'step'],
    [{ choreography_ids: [1], step: 3, spread: 'x' }, 'spread'],
    [{ step: 3 }, 'choreography_ids'],
  ])('returns 400 for %j', async (body, hint) => {
    const res = await request(app).post('/api/practice/baseline').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(hint);
  });

  it('returns 404 for an unknown dance and 400 for a dance that is not learned', async () => {
    const wish = await createChoreo('Wish');
    expect(
      (
        await request(app)
          .post('/api/practice/baseline')
          .send({ choreography_ids: [9999], step: 3 })
      ).status,
    ).toBe(404);
    const res = await request(app)
      .post('/api/practice/baseline')
      .send({ choreography_ids: [wish], step: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('learned');
  });
});

describe('GET /api/practice/intervals', () => {
  it('returns the interval ladder of every level tier', async () => {
    const res = await request(app).get('/api/practice/intervals');
    expect(res.status).toBe(200);
    expect(res.body.tiers.map((tier: { name: string }) => tier.name)).toEqual([
      'Beginner',
      'Improver',
      'Intermediate',
      'Advanced',
    ]);
    expect(res.body.tiers[0].interval_days.at(-1)).toBe(182);
    expect(res.body.tiers.at(-1).max_level_value).toBeNull();
  });
});
