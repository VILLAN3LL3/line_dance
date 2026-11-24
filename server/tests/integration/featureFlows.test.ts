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
import { prepareParticipantPdf } from '../../features/courses/participant-pdf-flow.ts';
import { prepareCoursePdfId } from '../../features/courses/pdf-operations.ts';
import * as trainers from '../../features/trainers/flow.ts';
import { validateTrainer } from '../../features/trainers/validation.ts';
import type { TrainerInput } from '../../features/trainers/validation.ts';
import * as ratings from '../../features/ratings/flow.ts';
import { validateRating } from '../../features/ratings/validation.ts';
import * as choreography from '../../features/choreographies/write-flow.ts';
import {
  preparePartialWriteRequest,
  prepareWriteRequest,
} from '../../features/choreographies/validation.ts';

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

describe('participant PDF flow', () => {
  async function insertDance(
    name: string,
    figures: number[],
    extra: string[] = [],
  ): Promise<number> {
    const result = await runQuery(
      `INSERT INTO choreographies (name, level_id, count, wall_count, step_sheet_link, demo_video_url)
       SELECT ?, id, 32, 4, ?, ? FROM levels WHERE name = 'BEGINNER'`,
      [name, extra[0] ?? null, extra[1] ?? null],
    );
    for (const figure of figures) {
      await runQuery(
        'INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?)',
        [result.id, figure],
      );
    }
    return result.id;
  }

  async function insertSession(courseId: number, date: string): Promise<number> {
    const result = await runQuery(
      'INSERT INTO sessions (dance_course_id, session_date) VALUES (?, ?)',
      [courseId, date],
      'danceGroups',
    );
    return result.id;
  }

  async function assign(sessionId: number, danceId: number, isNew: number): Promise<void> {
    await runQuery(
      'INSERT INTO session_choreographies (session_id, choreography_id, is_new) VALUES (?, ?, ?)',
      [sessionId, danceId, isNew],
      'danceGroups',
    );
  }

  it('lists new dances per session with official levels, QR codes and unknown steps only', async () => {
    const base = (await runQuery("INSERT INTO step_figures (name) VALUES ('Base')")).id;
    const old = (await runQuery("INSERT INTO step_figures (name) VALUES ('Old')")).id;
    const fresh = (await runQuery("INSERT INTO step_figures (name) VALUES ('Fresh')")).id;
    const group = await createTestGroup('Group');
    await runQuery(
      'INSERT OR IGNORE INTO group_base_step_figures (dance_group_id, step_figure_id) VALUES (?, ?)',
      [group.id, base],
      'danceGroups',
    );
    const earlierCourse = await createTestCourse({ dance_group_id: group.id, name: 'Earlier' });
    const course = await createTestCourse({ dance_group_id: group.id, name: 'Current' });

    const oldDance = await insertDance('Old Dance', [old]);
    await assign(await insertSession(earlierCourse.id, '2024-01-01'), oldDance, 1);
    const newDance = await insertDance(
      'New Dance',
      [base, old, fresh],
      ['https://example.com/sheet', 'https://example.com/video'],
    );
    const noLinks = await insertDance('No Links', []);
    await runQuery(
      "INSERT INTO personal_data.choreography_personal_levels (choreography_id, level_id) SELECT ?, id FROM levels WHERE name = 'ADVANCED'",
      [newDance],
    );
    await runQuery("INSERT INTO authors (name) VALUES ('Jane')");
    await runQuery(
      'INSERT INTO choreography_authors (choreography_id, author_id) SELECT ?, id FROM authors',
      [newDance],
    );
    const first = await insertSession(course.id, '2025-01-01');
    const second = await insertSession(course.id, '2025-01-08');
    await insertSession(course.id, '2025-01-15');
    await assign(first, newDance, 1);
    await assign(first, noLinks, 1);
    await assign(second, newDance, 0);

    const result = await prepareParticipantPdf(prepareCoursePdfId({ id: String(course.id) }));
    if ('error' in result) throw new Error('Participant PDF preparation failed');
    const { sessions, learnedSteps } = result.value;
    expect(sessions.map((session) => session.dances.map((dance) => dance.name))).toEqual([
      ['New Dance', 'No Links'],
      [],
      [],
    ]);
    expect(sessions[0].dances[0]).toMatchObject({ level: 'BEGINNER', authors: ['Jane'] });
    expect(sessions[0].dances[0].stepSheet?.qr.subarray(1, 4).toString()).toBe('PNG');
    expect(sessions[0].dances[0].demoVideo?.url).toBe('https://example.com/video');
    expect(sessions[0].dances[1]).toMatchObject({ stepSheet: null, demoVideo: null });
    expect(learnedSteps).toEqual(['Fresh']);
    expect(await prepareParticipantPdf(prepareCoursePdfId({ id: '999' }))).toEqual({
      error: 'course_not_found',
    });
  });

  it('returns an empty document for a course without sessions', async () => {
    const group = await createTestGroup('Group');
    const course = await createTestCourse({ dance_group_id: group.id, name: 'Empty' });
    const result = await prepareParticipantPdf(prepareCoursePdfId({ id: String(course.id) }));
    if ('error' in result) throw new Error('Participant PDF preparation failed');
    expect(result.value).toMatchObject({ sessions: [], learnedSteps: [], trainerQr: null });
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

  async function createDance(personalLevel?: string | null): Promise<number> {
    const result = await choreography.createChoreography(
      prepareWriteRequest({
        name: 'Dance',
        level: 'Beginner',
        ...(personalLevel === undefined ? {} : { personal_level: personalLevel }),
      }),
    );
    if ('error' in result) throw new Error(`Failed to create dance: ${result.error}`);
    return result.value;
  }

  const update = async (
    id: number,
    body: Record<string, unknown>,
  ): ReturnType<typeof choreography.updateChoreography> =>
    choreography.updateChoreography(id, preparePartialWriteRequest({ name: 'Dance', ...body }));

  it('saves, replaces and removes the personal level in the attached personal database', async () => {
    const id = await createDance('advanced');
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
    await update(id, { personal_level: 'Beginner' });
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'BEGINNER' });
    await update(id, { personal_level: null });
    expect(await getQuery(storedLevel, [id])).toBeUndefined();
  });

  it('keeps the personal level when the update does not mention it', async () => {
    const id = await createDance('ADVANCED');
    await update(id, { name: 'Renamed' });
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
  });

  it.each([[''], ['   '], [null]])('treats %j as removing the personal level', async (value) => {
    const id = await createDance('ADVANCED');
    await update(id, { personal_level: value });
    expect(await getQuery(storedLevel, [id])).toBeUndefined();
  });

  it('reports an unknown personal level as a field issue and writes nothing', async () => {
    const issue = { field: 'personal_level', key: 'invalid_level' };
    const created = await choreography.createChoreography(
      prepareWriteRequest({ name: 'Dance', level: 'Beginner', personal_level: 'bogus' }),
    );
    expect(created).toEqual({ error: 'validation', issues: [issue] });
    expect(await getQuery('SELECT id FROM choreographies')).toBeUndefined();

    const id = await createDance('ADVANCED');
    expect(await update(id, { name: 'Renamed', personal_level: 'bogus' })).toEqual({
      error: 'validation',
      issues: [issue],
    });
    expect(await update(id, { personal_level: 42 })).toEqual({
      error: 'validation',
      issues: [issue],
    });
    expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
    expect(await getQuery('SELECT name FROM choreographies WHERE id = ?', [id])).toEqual({
      name: 'Dance',
    });
  });

  it('rolls the whole update back when saving the personal level fails', async () => {
    const id = await createDance('ADVANCED');
    await runQuery(
      "CREATE TEMP TRIGGER reject_personal_level_update BEFORE UPDATE ON personal_data.choreography_personal_levels BEGIN SELECT RAISE(ABORT, 'Personal level update failed'); END",
    );
    try {
      await expect(update(id, { name: 'Renamed', personal_level: 'BEGINNER' })).rejects.toThrow(
        'Personal level update failed',
      );
      expect(await getQuery(storedLevel, [id])).toEqual({ name: 'ADVANCED' });
      expect(await getQuery('SELECT name FROM choreographies WHERE id = ?', [id])).toEqual({
        name: 'Dance',
      });
    } finally {
      await runQuery('DROP TRIGGER reject_personal_level_update');
    }
  });

  it('removes the personal level together with the choreography', async () => {
    const id = await createDance('ADVANCED');
    await choreography.deleteChoreography(id);
    expect(await getQuery(storedLevel, [id])).toBeUndefined();
  });
});
