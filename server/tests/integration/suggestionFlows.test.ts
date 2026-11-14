import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as groups from '../../features/groups/flow.js';
import * as courses from '../../features/courses/flow.js';
import * as sessions from '../../features/sessions/flow.js';
import * as suggestions from '../../features/suggestions/flow.ts';
import {
  prepareGroupSuggestion,
  prepareSessionSuggestion,
} from '../../features/suggestions/operations.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
});

describe('step figure suggestion flows', () => {
  it('expands base figure hierarchy and returns matching group and session suggestions', async () => {
    const parent = await runQuery("INSERT INTO step_figures (name) VALUES ('Parent')");
    const child = await runQuery("INSERT INTO step_figures (name) VALUES ('Child')");
    const missing = await runQuery("INSERT INTO step_figures (name) VALUES ('Missing')");
    await runQuery(
      'INSERT INTO step_figure_components (parent_step_figure_id, child_step_figure_id) VALUES (?, ?)',
      [parent.id, child.id],
    );
    const dance = await runQuery(
      "INSERT INTO choreographies (name, level_id) SELECT 'Dance', id FROM levels LIMIT 1",
    );
    await runQuery(
      'INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?), (?, ?)',
      [dance.id, child.id, dance.id, missing.id],
    );
    const group = await groups.createGroup({ name: 'Group' });
    await groups.updateBaseFigures(String(group.value.id), { step_figure_ids: [parent.id] });
    const course = await courses.createCourse({ dance_group_id: group.value.id, name: 'Course' });
    const session = await sessions.createSession({
      dance_course_id: course.value.id,
      session_date: '2099-01-01',
    });

    expect(
      await suggestions.getGroupSuggestions(
        prepareGroupSuggestion({ groupId: String(group.value.id) }),
      ),
    ).toEqual({
      value: [{ step_figure: 'Missing', additional_choreographies: 1 }],
    });
    expect(
      await suggestions.getSessionSuggestions(
        prepareSessionSuggestion({ sessionId: String(session.value.id) }),
      ),
    ).toEqual({
      value: {
        suggestions: [{ step_figure: 'Missing', additional_choreographies: 1 }],
        known_step_figures: ['Child', 'Parent'],
        max_level_value: null,
      },
    });
  });

  it('returns domain errors for invalid and missing groups or sessions', async () => {
    expect(await suggestions.getGroupSuggestions(prepareGroupSuggestion({ groupId: '0' }))).toEqual(
      { error: 'invalid_group_id' },
    );
    expect(
      await suggestions.getGroupSuggestions(prepareGroupSuggestion({ groupId: '999' })),
    ).toEqual({ error: 'group_not_found' });
    expect(
      await suggestions.getSessionSuggestions(prepareSessionSuggestion({ sessionId: '0' })),
    ).toEqual({ error: 'invalid_session_id' });
    expect(
      await suggestions.getSessionSuggestions(prepareSessionSuggestion({ sessionId: '999' })),
    ).toEqual({ error: 'session_not_found' });
  });
});
