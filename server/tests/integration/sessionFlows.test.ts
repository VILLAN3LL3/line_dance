import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as groups from '../../features/groups/flow.ts';
import { validateGroupName } from '../../features/groups/validation.ts';
import * as courses from '../../features/courses/flow.ts';
import { prepareNewCourse } from '../../features/courses/validation.ts';
import * as sessions from '../../features/sessions/flow.ts';
import type { Session } from '../../features/sessions/repository.ts';
import {
  validateAssignment,
  validateNewSession,
  validateReorder,
  validateSessionId,
  validateSessionUpdate,
  validateSwap,
} from '../../features/sessions/validation.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

function requireValue<T>(result: { value: T } | { error: string }): NonNullable<T> {
  if ('error' in result) throw new Error(`Unexpected flow error: ${result.error}`);
  if (result.value == null) throw new Error('Expected flow result');
  return result.value;
}

async function createCourseSessions(): Promise<Session[]> {
  const group = requireValue(await groups.createGroup(validateGroupName({ name: 'Group' })));
  const course = requireValue(
    await courses.createCourse(prepareNewCourse({ dance_group_id: group.id, name: 'Course' })),
  );
  const result: Session[] = [];
  for (const date of ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22']) {
    const session = requireValue(
      await sessions.createSession(
        validateNewSession({
          dance_course_id: course.id,
          session_date: date,
          comment: date,
        }),
      ),
    );
    result.push(session);
  }
  return result;
}

describe('session integration flows', () => {
  it('creates repetitions and moves assignments and comments together on reorder', async () => {
    const slots = await createCourseSessions();
    const source = requireValue(
      await sessions.addAssignment(
        validateAssignment({
          session_id: slots[0].id,
          choreography_id: 42,
        }),
      ),
    );
    expect(source).toMatchObject({ is_new: true, auto_repeat: true });
    expect(
      requireValue(await sessions.getAssignments(validateSessionId(slots[1].id)))[0],
    ).toMatchObject({
      is_new: false,
      repeat_source_id: source.id,
      repetition_number: 1,
    });
    expect(
      await sessions.reorderContents(validateReorder({ session_ids: [slots[1].id, slots[0].id] })),
    ).toEqual({
      value: true,
    });
    expect(
      (await sessions.getSessions(slots[0].dance_course_id)).slice(0, 2).map((s) => s.comment),
    ).toEqual(['2026-01-08', '2026-01-01']);
    expect(
      requireValue(await sessions.getAssignments(validateSessionId(slots[1].id)))[0],
    ).toMatchObject({
      id: source.id,
      is_new: true,
    });
    expect(
      requireValue(await sessions.getAssignments(validateSessionId(slots[3].id)))[0],
    ).toMatchObject({
      repeat_source_id: source.id,
      repetition_number: 2,
    });
    expect(await sessions.removeAssignment(source.id)).toEqual({ value: true });
    expect(requireValue(await sessions.getAssignments(validateSessionId(slots[2].id)))).toEqual([]);
    expect(requireValue(await sessions.getAssignments(validateSessionId(slots[3].id)))).toEqual([]);
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
        sessions.addAssignment(
          validateAssignment({ session_id: slots[0].id, choreography_id: 42 }),
        ),
      ).rejects.toThrow('Repeat failure');
      expect(requireValue(await sessions.getAssignments(validateSessionId(slots[0].id)))).toEqual(
        [],
      );
    } finally {
      await runQuery('DROP TRIGGER fail_session_repeat', [], 'danceGroups');
    }
  });

  it('returns domain errors for duplicate assignments and invalid or missing sessions', async () => {
    const slots = await createCourseSessions();
    requireValue(
      await sessions.addAssignment(
        validateAssignment({ session_id: slots[0].id, choreography_id: 42 }),
      ),
    );
    expect(
      await sessions.addAssignment(
        validateAssignment({ session_id: slots[0].id, choreography_id: 42 }),
      ),
    ).toEqual({
      error: 'duplicate_assignment',
    });
    expect(await sessions.updateSession(999, validateSessionUpdate({ session_date: '' }))).toEqual({
      error: 'date_required',
    });
    expect(await sessions.swapContents(validateSwap(String(slots[0].id), '999'))).toEqual({
      error: 'session_not_found',
    });
  });

  it('rolls back comments, assignments and repetitions if restoring contents fails', async () => {
    const slots = await createCourseSessions();
    requireValue(
      await sessions.addAssignment(
        validateAssignment({ session_id: slots[0].id, choreography_id: 42 }),
      ),
    );
    const beforeSessions = await sessions.getSessions(slots[0].dance_course_id);
    const beforeAssignments = await Promise.all(
      slots.map(async (slot) =>
        requireValue(await sessions.getAssignments(validateSessionId(slot.id))),
      ),
    );
    await runQuery(
      `CREATE TEMP TRIGGER fail_content_restore BEFORE INSERT ON session_choreographies
       WHEN NEW.repeat_source_id IS NULL BEGIN SELECT RAISE(ABORT, 'Restore failure'); END`,
      [],
      'danceGroups',
    );
    try {
      await expect(
        sessions.reorderContents(validateReorder({ session_ids: [slots[1].id, slots[0].id] })),
      ).rejects.toThrow('Restore failure');
      expect(await sessions.getSessions(slots[0].dance_course_id)).toEqual(beforeSessions);
      expect(
        await Promise.all(
          slots.map(async (slot) =>
            requireValue(await sessions.getAssignments(validateSessionId(slot.id))),
          ),
        ),
      ).toEqual(beforeAssignments);
    } finally {
      await runQuery('DROP TRIGGER fail_content_restore', [], 'danceGroups');
    }
  });
});
