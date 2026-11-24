import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.ts';
import { allQuery, runQuery } from '../../scripts/db.ts';
import {
  getPracticeSuggestions,
  listPracticeLog,
  logPractice,
  removePracticeEntry,
  setPracticeBaseline,
} from '../../features/practice/flow.ts';
import {
  validateBaseline,
  validateLogList,
  validateLogPractice,
} from '../../features/practice/validation.ts';
import { formatLocalDate } from '../../features/practice/operations.ts';

async function createChoreography(name: string): Promise<number> {
  const level = await allQuery<{ id: number }>("SELECT id FROM levels WHERE name = 'BEGINNER'");
  const result = await runQuery('INSERT INTO choreographies (name, level_id) VALUES (?, ?)', [
    name,
    level[0].id,
  ]);
  return result.id;
}

async function entryCount(): Promise<number> {
  const rows = await allQuery<{ count: number }>(
    'SELECT COUNT(*) AS count FROM personal_data.choreography_practice_log',
  );
  return rows[0].count;
}

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

describe('practice flow', () => {
  it('logs several dances for today by default', async () => {
    const a = await createChoreography('A');
    const b = await createChoreography('B');
    const result = await logPractice(validateLogPractice({ choreography_ids: [a, b] }));
    expect(result).toEqual({ value: { logged: 2, practiced_on: formatLocalDate(new Date()) } });
    expect(await entryCount()).toBe(2);
  });

  it('stores nothing when one dance does not exist', async () => {
    const a = await createChoreography('A');
    expect(await logPractice(validateLogPractice({ choreography_ids: [a, 9999] }))).toEqual({
      error: 'not_found',
    });
    expect(await entryCount()).toBe(0);
  });

  it('rolls back earlier entries when a write fails', async () => {
    const a = await createChoreography('A');
    const b = await createChoreography('B');
    await runQuery(
      `CREATE TRIGGER personal_data.fail_second BEFORE INSERT ON choreography_practice_log
       WHEN NEW.choreography_id = ${b} BEGIN SELECT RAISE(ABORT, 'boom'); END`,
    );
    try {
      await expect(logPractice(validateLogPractice({ choreography_ids: [a, b] }))).rejects.toThrow(
        'boom',
      );
      expect(await entryCount()).toBe(0);
    } finally {
      await runQuery('DROP TRIGGER personal_data.fail_second');
    }
  });

  it('rejects future dates and songs of other dances', async () => {
    const a = await createChoreography('A');
    const b = await createChoreography('B');
    const song = await runQuery(
      'INSERT INTO choreography_songs (choreography_id, title) VALUES (?, ?)',
      [b, 'Song'],
    );
    expect(
      await logPractice(validateLogPractice({ choreography_ids: [a], practiced_on: '2999-01-01' })),
    ).toEqual({ error: 'future_date' });
    expect(
      await logPractice(validateLogPractice({ choreography_ids: [a], song_id: song.id })),
    ).toEqual({ error: 'invalid_song' });
    expect(
      await logPractice(validateLogPractice({ choreography_ids: [b], song_id: song.id })),
    ).toMatchObject({ value: { logged: 1 } });
    expect(await entryCount()).toBe(1);
  });

  it('lists the log newest first with dance and song names', async () => {
    const a = await createChoreography('A');
    await logPractice(validateLogPractice({ choreography_ids: [a], practiced_on: '2026-01-01' }));
    await logPractice(validateLogPractice({ choreography_ids: [a], practiced_on: '2026-02-01' }));
    const result = await listPracticeLog(validateLogList({ limit: '1' }));
    expect(result).toMatchObject({
      value: [{ choreography_name: 'A', practiced_on: '2026-02-01', song_title: null }],
    });
  });

  it('removes an entry and reports unknown ones', async () => {
    const a = await createChoreography('A');
    await logPractice(validateLogPractice({ choreography_ids: [a] }));
    const [{ id }] = await allQuery<{ id: number }>(
      'SELECT id FROM personal_data.choreography_practice_log',
    );
    expect(await removePracticeEntry(String(id))).toEqual({ value: true });
    expect(await removePracticeEntry(String(id))).toEqual({ error: 'not_found' });
    expect(await removePracticeEntry('x')).toEqual({ error: 'invalid_id' });
  });

  it('suggests only learned dances, the never practiced first', async () => {
    const practiced = await createChoreography('Practiced');
    const fresh = await createChoreography('Fresh');
    const wish = await createChoreography('Wish');
    await runQuery(
      `INSERT INTO personal_data.choreography_learning_status (choreography_id, status)
       VALUES (?, 'learned'), (?, 'learned'), (?, 'wishlist')`,
      [practiced, fresh, wish],
    );
    await logPractice(validateLogPractice({ choreography_ids: [practiced, wish] }));
    const suggestions = await getPracticeSuggestions();
    expect(suggestions.map((s) => s.choreography_id)).toEqual([fresh, practiced]);
    expect(suggestions[1]).toMatchObject({ practice_count: 1, is_due: false });
  });
});

describe('practice baseline flow', () => {
  async function learned(name: string): Promise<number> {
    const id = await createChoreography(name);
    await runQuery(
      "INSERT INTO personal_data.choreography_learning_status (choreography_id, status) VALUES (?, 'learned')",
      [id],
    );
    return id;
  }

  it('puts learned dances on a step and keeps them out of the due list', async () => {
    const a = await learned('A');
    const b = await learned('B');
    const result = await setPracticeBaseline(
      validateBaseline({ choreography_ids: [a, b], step: 8, spread: false }),
    );
    expect(result).toEqual({ value: { updated: 2, step: 8 } });
    const suggestions = await getPracticeSuggestions();
    expect(suggestions).toHaveLength(2);
    suggestions.forEach((summary) =>
      expect(summary).toMatchObject({ is_due: false, practice_count: 0, last_practiced_on: null }),
    );
  });

  it('rejects unknown and not learned dances and stores nothing', async () => {
    const a = await learned('A');
    const wish = await createChoreography('Wish');
    expect(
      await setPracticeBaseline(validateBaseline({ choreography_ids: [a, 9999], step: 3 })),
    ).toEqual({ error: 'not_found' });
    expect(
      await setPracticeBaseline(validateBaseline({ choreography_ids: [a, wish], step: 3 })),
    ).toEqual({ error: 'not_learned' });
    expect(
      await setPracticeBaseline(validateBaseline({ choreography_ids: [a], step: 99 })),
    ).toEqual({
      error: 'invalid_step',
    });
    expect(await entryCount()).toBe(0);
  });

  it('rolls back all entries when one write fails', async () => {
    const a = await learned('A');
    const b = await learned('B');
    await runQuery(
      `CREATE TRIGGER personal_data.fail_baseline BEFORE INSERT ON choreography_practice_log
       WHEN NEW.choreography_id = ${b} BEGIN SELECT RAISE(ABORT, 'boom'); END`,
    );
    try {
      await expect(
        setPracticeBaseline(validateBaseline({ choreography_ids: [a, b], step: 3 })),
      ).rejects.toThrow('boom');
      expect(await entryCount()).toBe(0);
    } finally {
      await runQuery('DROP TRIGGER personal_data.fail_baseline');
    }
  });

  it('lists the baseline entry in the log with its step and due date', async () => {
    const a = await learned('A');
    await setPracticeBaseline(validateBaseline({ choreography_ids: [a], step: 5, spread: false }));
    const result = await listPracticeLog(validateLogList({}));
    expect(result).toMatchObject({ value: [{ choreography_id: a, step: 5 }] });
    expect(result).toMatchObject({
      value: [{ due_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }],
    });
  });
});
