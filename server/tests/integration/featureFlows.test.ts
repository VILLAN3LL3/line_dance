import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.ts';
import { getQuery, runQuery } from '../../scripts/db.ts';
import * as groups from '../../features/groups/flow.ts';
import {
  prepareBaseFigureId,
  prepareGroupId,
  validateGroupName,
} from '../../features/groups/validation.ts';
import type { Group } from '../../features/groups/repository.ts';
import * as courses from '../../features/courses/flow.ts';
import { prepareCourseInput, prepareNewCourse } from '../../features/courses/validation.ts';
import type { Course } from '../../features/courses/repository.ts';
import { prepareCoursePdf } from '../../features/courses/pdf-flow.ts';
import { prepareCoursePdfId } from '../../features/courses/pdf-operations.ts';
import * as trainers from '../../features/trainers/flow.ts';
import { validateTrainer } from '../../features/trainers/validation.ts';
import type { TrainerInput } from '../../features/trainers/validation.ts';
import * as ratings from '../../features/ratings/flow.ts';
import { validateRating } from '../../features/ratings/validation.ts';
import * as personalLevels from '../../features/personal-levels/flow.ts';
import { validatePersonalLevel } from '../../features/personal-levels/validation.ts';

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

async function createTestGroup(name: string): Promise<Group> {
  const result = await groups.createGroup(validateGroupName({ name }));
  if ('error' in result || !result.value) throw new Error('Group creation failed');
  return result.value;
}

async function createTestCourse(input: unknown): Promise<Course> {
  const result = await courses.createCourse(prepareNewCourse(input));
  if ('error' in result || !result.value) throw new Error('Course creation failed');
  return result.value;
}

describe('group, course and trainer flows', () => {
  it('creates defaults, assigns a trainer, and clears assignments when deleting the trainer', async () => {
    await runQuery("INSERT INTO step_figures (name) VALUES ('Kick')");
    const group = await createTestGroup(' Group ');
    const trainer = await trainers.createTrainer(validTrainer());
    if (!('value' in trainer) || !trainer.value) throw new Error('Trainer creation failed');

    const course = await createTestCourse({
      dance_group_id: group.id,
      name: 'Course',
      trainer_id: trainer.value.id,
    });

    expect(
      await groups.getBaseFigures(prepareBaseFigureId({ groupId: String(group.id) })),
    ).toMatchObject({
      value: [{ name: 'Kick' }],
    });
    expect(course.trainer_id).toBe(trainer.value.id);
    expect(await trainers.deleteTrainer(trainer.value.id)).toEqual({ value: true });
    expect(await courses.getCourses(group.id)).toMatchObject([{ trainer_id: null }]);
  });

  it('rolls back all default assignments if group creation fails', async () => {
    await runQuery("INSERT INTO step_figures (name) VALUES ('Kick')");
    await runQuery(
      "CREATE TEMP TRIGGER reject_default_figure BEFORE INSERT ON group_base_step_figures BEGIN SELECT RAISE(ABORT, 'Forced failure'); END",
      [],
      'danceGroups',
    );
    try {
      await expect(groups.createGroup(validateGroupName({ name: 'Group' }))).rejects.toThrow(
        'Forced failure',
      );
      expect(await groups.getGroups()).toEqual([]);
    } finally {
      await runQuery('DROP TRIGGER reject_default_figure', [], 'danceGroups');
    }
  });

  it('returns domain errors without HTTP status codes', async () => {
    expect(await trainers.updateTrainer(999, validTrainer())).toEqual({
      error: 'not_found',
    });

    expect(
      await courses.createCourse(prepareNewCourse({ dance_group_id: 999, name: 'Course' })),
    ).toEqual({
      error: 'group_not_found',
    });
    expect(await groups.getGroup(prepareGroupId({ id: '999' }))).toEqual({
      error: 'group_not_found',
    });
  });

  it('preserves the stored course when an update fails', async () => {
    const group = await createTestGroup('Group');
    const course = await createTestCourse({ dance_group_id: group.id, name: 'Original' });
    await runQuery(
      "CREATE TEMP TRIGGER reject_course_update AFTER UPDATE ON dance_courses BEGIN SELECT RAISE(ABORT, 'Course update failed'); END",
      [],
      'danceGroups',
    );
    try {
      await expect(
        courses.updateCourse(course.id, prepareCourseInput({ name: 'Changed' })),
      ).rejects.toThrow('Course update failed');
      expect(await courses.getCourses(group.id)).toMatchObject([
        { id: course.id, name: 'Original' },
      ]);
    } finally {
      await runQuery('DROP TRIGGER reject_course_update', [], 'danceGroups');
    }
  });

  it('prepares PDF data and QR codes from persisted course and session data', async () => {
    const group = await createTestGroup('Group');
    const course = await createTestCourse({
      dance_group_id: group.id,
      name: 'Course',
      youtube_playlist_url: 'https://example.com/video',
    });
    await runQuery(
      'INSERT INTO sessions (dance_course_id, session_date) VALUES (?, ?), (?, ?)',
      [course.id, '2026-02-01', course.id, '2026-01-01'],
      'danceGroups',
    );
    const result = await prepareCoursePdf(prepareCoursePdfId({ id: String(course.id) }));
    if ('error' in result) throw new Error('Course PDF preparation failed');
    expect(result.value.sessions).toMatchObject([
      { session_date: '2026-01-01' },
      { session_date: '2026-02-01' },
    ]);
    expect(result.value.linksWithQr[0].qr.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(await prepareCoursePdf(prepareCoursePdfId({ id: '999' }))).toEqual({
      error: 'course_not_found',
    });
  });
  it('propagates QR generation failures without returning a partial document', async () => {
    const group = await createTestGroup('Group');
    const course = await createTestCourse({ dance_group_id: group.id, name: 'Course' });
    await runQuery(
      'UPDATE dance_courses SET youtube_playlist_url = ? WHERE id = ?',
      ['https://example.com/' + 'a'.repeat(5000), course.id],
      'danceGroups',
    );
    await expect(prepareCoursePdf(prepareCoursePdfId({ id: String(course.id) }))).rejects.toThrow();
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

describe('personal level flow', () => {
  const storedLevel = `SELECT l.name FROM personal_data.choreography_personal_levels p
    JOIN levels l ON l.id = p.level_id WHERE p.choreography_id = ?`;

  async function createDance(): Promise<number> {
    const choreography = await runQuery(
      "INSERT INTO choreographies (name, level_id) SELECT 'Dance', id FROM levels LIMIT 1",
    );
    return choreography.id;
  }

  it('saves, replaces and removes the personal level in the attached personal database', async () => {
    const id = await createDance();
    expect(
      await personalLevels.setPersonalLevel(
        String(id),
        validatePersonalLevel({ level: 'advanced' }),
      ),
    ).toEqual({
      value: { choreography_id: id, level: 'ADVANCED' },
    });
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
    await personalLevels.setPersonalLevel(String(id), validatePersonalLevel({ level: 'Beginner' }));
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'BEGINNER' });
    expect(await personalLevels.removePersonalLevel(String(id))).toEqual({ value: true });
    expect(await getQuery(storedLevel, [id])).toBeUndefined();
  });

  it('returns domain errors and keeps the existing personal level', async () => {
    const id = await createDance();
    await personalLevels.setPersonalLevel(String(id), validatePersonalLevel({ level: 'ADVANCED' }));
    expect(
      await personalLevels.setPersonalLevel('abc', validatePersonalLevel({ level: 'ADVANCED' })),
    ).toEqual({
      error: 'invalid_id',
    });
    expect(
      await personalLevels.setPersonalLevel('99999', validatePersonalLevel({ level: 'bogus' })),
    ).toEqual({
      error: 'not_found',
    });
    expect(
      await personalLevels.setPersonalLevel(String(id), validatePersonalLevel({ level: 'bogus' })),
    ).toEqual({
      error: 'invalid_level',
    });
    expect(await personalLevels.setPersonalLevel(String(id), validatePersonalLevel({}))).toEqual({
      error: 'invalid_level',
    });
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
  });

  it('propagates a failed update and preserves the existing personal level', async () => {
    const id = await createDance();
    await personalLevels.setPersonalLevel(String(id), validatePersonalLevel({ level: 'ADVANCED' }));
    await runQuery(
      "CREATE TEMP TRIGGER reject_personal_level_update BEFORE UPDATE ON personal_data.choreography_personal_levels BEGIN SELECT RAISE(ABORT, 'Personal level update failed'); END",
    );
    try {
      await expect(
        personalLevels.setPersonalLevel(String(id), validatePersonalLevel({ level: 'BEGINNER' })),
      ).rejects.toThrow('Personal level update failed');
      expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
    } finally {
      await runQuery('DROP TRIGGER reject_personal_level_update');
    }
  });
});
