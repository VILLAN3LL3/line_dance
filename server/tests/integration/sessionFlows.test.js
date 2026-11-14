import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as groups from '../../features/groups/flow.ts';
import { validateGroupName } from '../../features/groups/validation.ts';
import * as courses from '../../features/courses/flow.ts';
import { prepareNewCourse } from '../../features/courses/validation.ts';
import * as sessions from '../../features/sessions/flow.js';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

async function createCourseSessions() {
  const group = await groups.createGroup(validateGroupName({ name: 'Group' }));
  const course = await courses.createCourse(
    prepareNewCourse({ dance_group_id: group.value.id, name: 'Course' }),
  );
  const result = [];
  for (const date of ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22']) {
    const session = await sessions.createSession({
      dance_course_id: course.value.id,
      session_date: date,
      comment: date,
    });
    result.push(session.value);
  }
  return result;
}

describe('session integration flows', () => {
  it('creates repetitions and moves assignments and comments together on reorder', async () => {
    const slots = await createCourseSessions();
    const source = await sessions.addAssignment({
      session_id: slots[0].id,
      choreography_id: 42,
    });
    expect(source.value).toMatchObject({ is_new: true, auto_repeat: true });
    expect((await sessions.getAssignments(slots[1].id)).value[0]).toMatchObject({
      is_new: false,
      repeat_source_id: source.value.id,
      repetition_number: 1,
    });
    expect(await sessions.reorderContents({ session_ids: [slots[1].id, slots[0].id] })).toEqual({
      value: true,
    });
    expect(
      (await sessions.getSessions(slots[0].dance_course_id)).slice(0, 2).map((s) => s.comment),
    ).toEqual(['2026-01-08', '2026-01-01']);
    expect((await sessions.getAssignments(slots[1].id)).value[0]).toMatchObject({
      id: source.value.id,
      is_new: true,
    });
    expect((await sessions.getAssignments(slots[3].id)).value[0]).toMatchObject({
      repeat_source_id: source.value.id,
      repetition_number: 2,
    });
    expect(await sessions.removeAssignment(source.value.id)).toEqual({ value: true });
    expect((await sessions.getAssignments(slots[2].id)).value).toEqual([]);
    expect((await sessions.getAssignments(slots[3].id)).value).toEqual([]);
  });

  it('rolls back the assignment when repetition creation fails', async () => {
    const slots = await createCourseSessions();
    await runQuery(
      `CREATE TEMP TRIGGER fail_session_repeat BEFORE INSERT ON session_choreographies
       WHEN NEW.repeat_source_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'Repeat failure'); END`,
      [],
      'danceGroups',
    );
    try {
      await expect(
        sessions.addAssignment({ session_id: slots[0].id, choreography_id: 42 }),
      ).rejects.toThrow('Repeat failure');
      expect((await sessions.getAssignments(slots[0].id)).value).toEqual([]);
    } finally {
      await runQuery('DROP TRIGGER fail_session_repeat', [], 'danceGroups');
    }
  });

  it('returns domain errors for duplicate assignments and invalid or missing sessions', async () => {
    const slots = await createCourseSessions();
    await sessions.addAssignment({ session_id: slots[0].id, choreography_id: 42 });
    expect(await sessions.addAssignment({ session_id: slots[0].id, choreography_id: 42 })).toEqual({
      error: 'duplicate_assignment',
    });
    expect(await sessions.updateSession(999, { session_date: '' })).toEqual({
      error: 'date_required',
    });
    expect(await sessions.swapContents(String(slots[0].id), '999')).toEqual({
      error: 'session_not_found',
    });
  });
});
