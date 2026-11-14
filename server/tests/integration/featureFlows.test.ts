import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { getQuery, runQuery } from '../../scripts/db.ts';
import * as groups from '../../features/groups/flow.js';
import * as courses from '../../features/courses/flow.js';
import { prepareCoursePdf } from '../../features/courses/pdf-flow.js';
import * as trainers from '../../features/trainers/flow.ts';
import { validateTrainer } from '../../features/trainers/validation.ts';
import type { TrainerInput } from '../../features/trainers/validation.ts';
import * as ratings from '../../features/ratings/flow.ts';
import { validateRating } from '../../features/ratings/validation.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

function validTrainer(): TrainerInput {
  const result = validateTrainer({ name: 'Trainer', phone: '1', email: 'a@b.test' });
  if ('error' in result) throw new Error('Invalid test trainer');
  return result.value;
}

describe('group, course and trainer flows', () => {
  it('creates defaults, assigns a trainer, and clears assignments when deleting the trainer', async () => {
    await runQuery("INSERT INTO step_figures (name) VALUES ('Kick')");
    const group = await groups.createGroup({ name: ' Group ' });
    const trainer = await trainers.createTrainer(validTrainer());
    if (!('value' in trainer) || !trainer.value) throw new Error('Trainer creation failed');

    const course = await courses.createCourse({
      dance_group_id: group.value.id,
      name: 'Course',
      trainer_id: trainer.value.id,
    });

    expect(await groups.getBaseFigures(String(group.value.id))).toMatchObject({
      value: [{ name: 'Kick' }],
    });
    expect(course.value.trainer_id).toBe(trainer.value.id);
    expect(await trainers.deleteTrainer(trainer.value.id)).toEqual({ value: true });
    expect(await courses.getCourses(group.value.id)).toMatchObject([{ trainer_id: null }]);
  });

  it('rolls back all default assignments if group creation fails', async () => {
    await runQuery("INSERT INTO step_figures (name) VALUES ('Kick')");
    await runQuery(
      "CREATE TEMP TRIGGER reject_default_figure BEFORE INSERT ON group_base_step_figures BEGIN SELECT RAISE(ABORT, 'Forced failure'); END",
      [],
      'danceGroups',
    );
    try {
      await expect(groups.createGroup({ name: 'Group' })).rejects.toThrow('Forced failure');
      expect(await groups.getGroups()).toEqual([]);
    } finally {
      await runQuery('DROP TRIGGER reject_default_figure', [], 'danceGroups');
    }
  });

  it('returns domain errors without HTTP status codes', async () => {
    expect(await trainers.updateTrainer(999, validTrainer())).toEqual({
      error: 'not_found',
    });

    expect(await courses.createCourse({ dance_group_id: 999, name: 'Course' })).toEqual({
      error: 'group_not_found',
    });
    expect(await groups.getGroup(999)).toEqual({ error: 'group_not_found' });
  });

  it('prepares PDF data and QR codes from persisted course and session data', async () => {
    const group = await groups.createGroup({ name: 'Group' });
    const course = await courses.createCourse({
      dance_group_id: group.value.id,
      name: 'Course',
      youtube_playlist_url: 'https://example.com/video',
    });
    await runQuery(
      'INSERT INTO sessions (dance_course_id, session_date) VALUES (?, ?), (?, ?)',
      [course.value.id, '2026-02-01', course.value.id, '2026-01-01'],
      'danceGroups',
    );
    const result = await prepareCoursePdf(course.value.id);
    if (!result.value) throw new Error('Course PDF preparation failed');
    expect(result.value.sessions).toMatchObject([
      { session_date: '2026-01-01' },
      { session_date: '2026-02-01' },
    ]);
    expect(result.value.linksWithQr[0].qr.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(await prepareCoursePdf(999)).toEqual({ error: 'course_not_found' });
  });
});

describe('rating flow', () => {
  it('saves and removes ratings in the attached personal database', async () => {
    const choreography = await runQuery(
      "INSERT INTO choreographies (name, level_id) SELECT 'Dance', id FROM levels LIMIT 1",
    );
    expect(
      await ratings.rateChoreography(String(choreography.id), validateRating({ rating: 5 })),
    ).toEqual({
      value: { choreography_id: choreography.id, rating: 5 },
    });
    const query = 'SELECT rating FROM personal_data.choreography_ratings WHERE choreography_id = ?';
    expect(await getQuery(query, [choreography.id])).toEqual({ rating: 5 });
    expect(await ratings.removeRating(String(choreography.id))).toEqual({ value: true });
    expect(await getQuery(query, [choreography.id])).toBeUndefined();
    expect(await ratings.rateChoreography('99999', validateRating({ rating: 9 }))).toEqual({
      error: 'not_found',
    });
  });

  it('propagates a failed update and preserves the existing rating', async () => {
    const choreography = await runQuery(
      "INSERT INTO choreographies (name, level_id) SELECT 'Dance', id FROM levels LIMIT 1",
    );
    const id = String(choreography.id);
    await ratings.rateChoreography(id, validateRating({ rating: 2 }));
    await runQuery(
      "CREATE TEMP TRIGGER reject_rating_update BEFORE UPDATE ON personal_data.choreography_ratings BEGIN SELECT RAISE(ABORT, 'Rating update failed'); END",
    );
    try {
      await expect(ratings.rateChoreography(id, validateRating({ rating: 5 }))).rejects.toThrow(
        'Rating update failed',
      );
      expect(
        await getQuery(
          'SELECT rating FROM personal_data.choreography_ratings WHERE choreography_id = ?',
          [choreography.id],
        ),
      ).toEqual({ rating: 2 });
    } finally {
      await runQuery('DROP TRIGGER reject_rating_update');
    }
  });

  it('validates and normalizes ratings before persistence', async () => {
    const choreography = await runQuery(
      "INSERT INTO choreographies (name, level_id) SELECT 'Dance', id FROM levels LIMIT 1",
    );
    const id = String(choreography.id);
    expect(await ratings.rateChoreography(id, validateRating({ rating: [3] }))).toEqual({
      value: { choreography_id: choreography.id, rating: 3 },
    });
    expect(await ratings.rateChoreography(id, validateRating({ rating: {} }))).toEqual({
      error: 'invalid_rating',
    });
    expect(
      await getQuery(
        'SELECT rating FROM personal_data.choreography_ratings WHERE choreography_id = ?',
        [choreography.id],
      ),
    ).toEqual({ rating: 3 });
  });
});
