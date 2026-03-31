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

async function post(body) {
  return request(app).post('/api/choreographies').send(body);
}

async function search(params) {
  return request(app).get('/api/choreographies/search').query(params);
}

// Sends the query as a raw URL string, bypassing supertest's .query() serialization.
// This exercises the actual Express query parser with bracket-notation arrays
// (e.g. level[]=Beginner&level[]=Advanced) exactly as a browser would send them.
async function searchRaw(queryString) {
  return request(app).get(`/api/choreographies/search?${queryString}`);
}

// Seed helpers
async function seedDances() {
  // Returns IDs in order: [waltz, tango, cha_cha]
  const waltz = await post({
    name: 'Waltz in the Rain',
    level: 'Beginner',
    count: 32,
    authors: ['Alice'],
    tags: ['classic', 'slow'],
    step_figures: ['Rock Step', 'Weave'],
  });
  const tango = await post({
    name: 'Argentine Tango',
    level: 'Advanced',
    count: 48,
    authors: ['Bob'],
    tags: ['classic'],
    step_figures: ['Kick', 'Weave'],
  });
  const cha_cha = await post({
    name: 'Cha Cha Fun',
    level: 'Intermediate',
    count: 16,
    authors: ['Alice', 'Carol'],
    tags: ['fun'],
    step_figures: ['Cha Cha', 'Rock Step'],
  });
  return { waltz: waltz.body, tango: tango.body, cha_cha: cha_cha.body };
}

// ---------------------------------------------------------------------------
// No filter — returns all
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — no filters', () => {
  it('returns all choreographies when no query params are given', async () => {
    await seedDances();
    const res = await search({});
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);
  });

  it('returns empty result when database is empty', async () => {
    const res = await search({});
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Search by name
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — search param', () => {
  it('matches choreographies by partial name (case-insensitive)', async () => {
    await seedDances();
    const res = await search({ search: 'tango' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Argentine Tango');
  }, 15000);

  it('returns empty when no name matches', async () => {
    await seedDances();
    const res = await search({ search: 'Polka' });
    expect(res.body.data).toEqual([]);
  });

  it('matches titles when query uses straight apostrophe and stored title uses curly apostrophe', async () => {
    const curlyTitle = 'We can\u2019t wait';
    await post({ name: curlyTitle, level: 'Beginner' });

    const res = await search({ search: "We can't wait" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe(curlyTitle);
  });
});

// ---------------------------------------------------------------------------
// Filter by level
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — level filter', () => {
  it('filters by a single level', async () => {
    await seedDances();
    const res = await search({ level: 'Beginner' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('filters by multiple levels (OR semantics)', async () => {
    await seedDances();
    const res = await search({ level: ['Beginner', 'Advanced'] });
    expect(res.body.data).toHaveLength(2);
    const names = res.body.data.map((c) => c.name).sort();
    expect(names).toEqual(['Argentine Tango', 'Waltz in the Rain']);
  });
});

// ---------------------------------------------------------------------------
// Filter by step_figures — "any" mode
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — step_figures "any" mode', () => {
  it('returns choreographies that have at least one of the specified figures', async () => {
    await seedDances();
    const res = await search({ step_figures: 'Cha Cha', step_figures_match_mode: 'any' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Cha Cha Fun');
  });

  it('returns distinct results when step_figures appear in multiple choreos', async () => {
    await seedDances();
    // 'Weave' appears in Waltz and Tango
    const res = await search({ step_figures: 'Weave', step_figures_match_mode: 'any' });
    expect(res.body.data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Filter by step_figures — "all" mode
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — step_figures "all" mode', () => {
  it('returns only choreographies that have all specified figures', async () => {
    await seedDances();
    // Only Waltz has both Rock Step AND Weave
    const res = await search({
      step_figures: ['Rock Step', 'Weave'],
      step_figures_match_mode: 'all',
    });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('returns multiple when all have the single required figure', async () => {
    await seedDances();
    // Rock Step appears in Waltz and Cha Cha
    const res = await search({ step_figures: 'Rock Step', step_figures_match_mode: 'all' });
    expect(res.body.data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Filter by step_figures — "exact" mode
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — step_figures "exact" mode', () => {
  it('returns only choreographies whose figures are a non-empty subset of the selection', async () => {
    await seedDances();
    // Request Rock Step + Weave in exact mode:
    // - Waltz has exactly {Rock Step, Weave} ✓
    // - Tango has {Kick, Weave} — Kick not in selection ✗
    // - Cha Cha has {Cha Cha, Rock Step} — Cha Cha not in selection ✗
    const res = await search({
      step_figures: ['Rock Step', 'Weave'],
      step_figures_match_mode: 'exact',
    });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('normalizes array-valued match mode and still applies exact semantics', async () => {
    await seedDances();
    const res = await search({
      step_figures: ['Rock Step', 'Weave'],
      // Simulates duplicate query params where parser yields an array value.
      step_figures_match_mode: ['all', 'exact'],
    });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('is monotonic: adding another step figure cannot remove results in exact mode', async () => {
    await seedDances();

    const base = await searchRaw(
      'level[]=Beginner&max_count=32&step_figures[]=Rock%20Step&step_figures[]=Weave&step_figures_match_mode=exact',
    );
    const expanded = await searchRaw(
      'level[]=Beginner&max_count=32&step_figures[]=Rock%20Step&step_figures[]=Weave&step_figures[]=Kick&step_figures_match_mode=exact',
    );

    const baseIds = new Set(base.body.data.map((c) => c.id));
    const expandedIds = new Set(expanded.body.data.map((c) => c.id));

    for (const id of baseIds) {
      expect(expandedIds.has(id)).toBe(true);
    }
  });

  it('handles object-like step_figures payloads (from large [] query arrays) in exact mode', async () => {
    await seedDances();

    // Simulates qs parsing when many step_figures[]=... values are passed.
    const objectLikeFigures = {
      0: 'Rock Step',
      1: 'Weave',
      2: 'Point',
      3: 'Heel Switch',
      4: 'Heel Bounce',
      5: 'Hitch',
      6: 'Coaster Step',
      7: 'Pivot',
      8: 'Brush',
      9: 'Diagonal Step',
      10: 'Hip Bump',
      11: 'Hip Sway',
      12: 'Swivel',
      13: 'Rocking Chair',
      14: 'Scuff',
      15: 'Drag',
      16: 'Knee Pop',
      17: 'Cross Step',
      18: 'Shoop',
      19: 'Flick',
      20: 'Grapevine',
    };

    const res = await search({
      step_figures: objectLikeFigures,
      step_figures_match_mode: 'exact',
    });

    // Waltz has {Rock Step, Weave}, which is a subset of the provided selection.
    expect(res.body.data.some((c) => c.name === 'Waltz in the Rain')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Filter — without_step_figures
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — without_step_figures', () => {
  it('returns only choreographies that have no step figures assigned', async () => {
    await seedDances();
    // Add one with no step figures
    await post({ name: 'Bare Dance', level: 'Beginner' });

    const res = await search({ without_step_figures: 'true' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Bare Dance');
  });
});

// ---------------------------------------------------------------------------
// Filter by tags
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — tags filter', () => {
  it('returns choreographies that have the specified tag', async () => {
    await seedDances();
    const res = await search({ tags: 'fun' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Cha Cha Fun');
  });

  it('returns choreographies matching any of multiple tags', async () => {
    await seedDances();
    const res = await search({ tags: ['fun', 'slow'] });
    const names = res.body.data.map((c) => c.name).sort();
    expect(names).toEqual(['Cha Cha Fun', 'Waltz in the Rain']);
  });
});

// ---------------------------------------------------------------------------
// Filter by authors
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — authors filter', () => {
  it('returns choreographies by a specific author', async () => {
    await seedDances();
    const res = await search({ authors: 'Bob' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Argentine Tango');
  });

  it('returns choreographies by author that co-authored multiple dances', async () => {
    await seedDances();
    const res = await search({ authors: 'Alice' });
    const names = res.body.data.map((c) => c.name).sort();
    expect(names).toEqual(['Cha Cha Fun', 'Waltz in the Rain']);
  });
});

// ---------------------------------------------------------------------------
// Filter by max_count
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — max_count filter', () => {
  it('returns choreographies with count <= max_count', async () => {
    await seedDances();
    const res = await search({ max_count: 32 });
    const names = res.body.data.map((c) => c.name).sort();
    expect(names).toEqual(['Cha Cha Fun', 'Waltz in the Rain']);
  });

  it('includes choreographies with null count', async () => {
    await post({ name: 'No Count', level: 'Beginner' }); // count is null
    const res = await search({ max_count: 0 });
    expect(res.body.data.some((c) => c.name === 'No Count')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — sorting', () => {
  it('sorts by name ascending', async () => {
    await seedDances();
    const res = await search({ sort_field: 'name', sort_direction: 'asc' });
    const names = res.body.data.map((c) => c.name);
    expect(names).toEqual(['Argentine Tango', 'Cha Cha Fun', 'Waltz in the Rain']);
  });

  it('sorts by name descending', async () => {
    await seedDances();
    const res = await search({ sort_field: 'name', sort_direction: 'desc' });
    const names = res.body.data.map((c) => c.name);
    expect(names).toEqual(['Waltz in the Rain', 'Cha Cha Fun', 'Argentine Tango']);
  });

  it('sorts by count ascending', async () => {
    await seedDances();
    const res = await search({ sort_field: 'count', sort_direction: 'asc' });
    const counts = res.body.data.map((c) => c.count);
    expect(counts).toEqual([16, 32, 48]);
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — pagination', () => {
  it('returns the correct page slice', async () => {
    await seedDances();
    const res = await search({ sort_field: 'name', sort_direction: 'asc', page: 1, limit: 2 });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.data[0].name).toBe('Argentine Tango');
  });

  it('returns the second page correctly', async () => {
    await seedDances();
    const res = await search({ sort_field: 'name', sort_direction: 'asc', page: 2, limit: 2 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });
});

// ---------------------------------------------------------------------------
// Query-parser regression — bracket notation (e.g. level[]=, step_figures[]= )
// ---------------------------------------------------------------------------
// These tests send raw URL strings so that the Express query parser is exercised
// with the same bracket-notation format that browsers / the frontend actually use.
// Using supertest's .query([...]) would bypass this layer because supertest
// serialises the array without brackets (level=Beginner&level=Advanced), which
// works even with Express 5's default 'simple' parser.

describe('GET /api/choreographies/search — bracket-notation query parser regression', () => {
  it('filters by multiple levels sent as level[]=', async () => {
    await seedDances();
    const res = await searchRaw('level[]=Beginner&level[]=Advanced');
    expect(res.status).toBe(200);
    const names = res.body.data.map((c) => c.name).sort();
    expect(names).toEqual(['Argentine Tango', 'Waltz in the Rain']);
  });

  it('filters by multiple step_figures sent as step_figures[]= in "all" mode', async () => {
    await seedDances();
    // Only Waltz has both Rock Step AND Weave
    const res = await searchRaw(
      'step_figures[]=Rock%20Step&step_figures[]=Weave&step_figures_match_mode=all',
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('filters by multiple step_figures sent as step_figures[]= in "exact" mode', async () => {
    await seedDances();
    const res = await searchRaw(
      'step_figures[]=Rock%20Step&step_figures[]=Weave&step_figures_match_mode=exact',
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('combines level[]= and max_count filters correctly', async () => {
    await seedDances();
    // Beginner (32 counts) and Advanced (48 counts); max_count=32 excludes Advanced
    const res = await searchRaw('level[]=Beginner&level[]=Advanced&max_count=32');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });
});

// ---------------------------------------------------------------------------
// Combined filters
// ---------------------------------------------------------------------------

describe('GET /api/choreographies/search — combined filters', () => {
  it('applies level AND author filters together', async () => {
    await seedDances();
    // Alice authored Waltz (Beginner) and Cha Cha (Intermediate)
    const res = await search({ authors: 'Alice', level: 'Beginner' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });

  it('applies name search AND tag filter together', async () => {
    await seedDances();
    const res = await search({ search: 'Waltz', tags: 'classic' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Waltz in the Rain');
  });
});
