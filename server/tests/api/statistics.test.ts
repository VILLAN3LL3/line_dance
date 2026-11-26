import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupChoreographyTestDb, clearChoreographyTables } from '../setup/testChoreographyDb.ts';
import app from '../setup/testChoreographyApp.ts';
import { runQuery } from '../../scripts/db.ts';
import type { RepertoireStatistics } from '../../contracts/api.ts';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

async function createChoreo(overrides: Record<string, unknown> = {}): Promise<number> {
  const res = await request(app)
    .post('/api/choreographies')
    .send({ name: `Dance ${Math.random()}`, level: 'BEGINNER', ...overrides });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function learn(id: number, date: string | null = '2026-01-15'): Promise<void> {
  await runQuery(
    "INSERT INTO personal_data.choreography_learning_status (choreography_id, status, status_date) VALUES (?, 'learned', ?)",
    [id, date],
  );
}

async function stats(): Promise<RepertoireStatistics> {
  const res = await request(app).get('/api/statistics/repertoire');
  expect(res.status).toBe(200);
  return res.body;
}

const labels = (items: { label: string; count: number }[]): string[] =>
  items.map((item) => `${item.label}:${item.count}`);

describe('GET /api/statistics/repertoire', () => {
  it('is empty without learned dances', async () => {
    await createChoreo();
    const body = await stats();
    expect(body).toMatchObject({
      total: 0,
      levels: [],
      genres: [],
      choreographers: [],
      years: [],
      timeline: { months: [], undated: 0 },
    });
  });

  it('counts only learned dances, not the wishlist', async () => {
    const learned = await createChoreo({ creation_year: 2020 });
    const wish = await createChoreo({ creation_year: 2021 });
    await learn(learned);
    await runQuery(
      "INSERT INTO personal_data.choreography_learning_status (choreography_id, status) VALUES (?, 'wishlist')",
      [wish],
    );
    await createChoreo({ creation_year: 2022 });

    const body = await stats();
    expect(body.total).toBe(1);
    expect(labels(body.years)).toEqual(['2020:1']);
  });

  it('groups by level, using the personal level when one is set', async () => {
    const official = await createChoreo({ level: 'BEGINNER' });
    const personal = await createChoreo({ level: 'BEGINNER', personal_level: 'ADVANCED' });
    await learn(official);
    await learn(personal);
    const body = await stats();
    expect(labels(body.levels)).toEqual(['BEGINNER:1', 'ADVANCED:1']);
  });

  it('uses tempo and genre of the default song: the favorite, else the first', async () => {
    const withFavorite = await createChoreo({
      choreography_songs: [
        { title: 'First', bpm: 90, genre: 'Pop', is_favorite: false },
        { title: 'Favorite', bpm: 130, genre: 'Country', is_favorite: true },
      ],
    });
    const firstSong = await createChoreo({
      choreography_songs: [
        { title: 'One', bpm: 150, genre: 'Latin' },
        { title: 'Two', bpm: 90, genre: 'Pop' },
      ],
    });
    const noSong = await createChoreo();
    await Promise.all([withFavorite, firstSong, noSong].map((id) => learn(id)));

    const body = await stats();
    expect(labels(body.tempo)).toEqual([
      'Below 100 BPM:0',
      '100–119 BPM:0',
      '120–139 BPM:1',
      '140–159 BPM:1',
      '160 BPM and above:0',
      'Unknown:1',
    ]);
    expect(labels(body.genres)).toEqual(['Country:1', 'Latin:1', 'Unknown:1']);
  });

  it('counts a dance for each choreographer', async () => {
    const both = await createChoreo({ authors: ['Ann', 'Bob'] });
    const ann = await createChoreo({ authors: ['Ann'] });
    const none = await createChoreo({ authors: [] });
    await createChoreo({ authors: ['Zed'] });
    await Promise.all([both, ann, none].map((id) => learn(id)));

    const body = await stats();
    expect(labels(body.choreographers)).toEqual(['Ann:2', 'Bob:1', 'Unknown:1']);
  });

  it('builds the timeline from the learning dates and the practices', async () => {
    const a = await createChoreo();
    const b = await createChoreo();
    const undated = await createChoreo();
    await learn(a, '2026-01-10');
    await learn(b, '2026-03-05');
    await learn(undated, null);
    await request(app)
      .post('/api/practice-log')
      .send({ choreography_ids: [a, b], practiced_on: '2026-02-01' });
    await request(app)
      .post('/api/practice/baseline')
      .send({ choreography_ids: [a], step: 5 });

    const { timeline } = await stats();
    expect(timeline.undated).toBe(1);
    const byMonth = Object.fromEntries(timeline.months.map((m: { month: string }) => [m.month, m]));
    expect(byMonth['2026-01']).toMatchObject({ learned: 1, total_learned: 2, practices: 0 });
    expect(byMonth['2026-02']).toMatchObject({ learned: 0, total_learned: 2, practices: 2 });
    expect(byMonth['2026-03']).toMatchObject({ learned: 1, total_learned: 3 });
    // The interval step of the baseline is no practice.
    const practices = timeline.months.reduce(
      (sum: number, m: { practices: number }) => sum + m.practices,
      0,
    );
    expect(practices).toBe(2);
  });
});
