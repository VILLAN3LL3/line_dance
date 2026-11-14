import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.js';
import { runQuery } from '../../scripts/db.ts';
import * as choreography from '../../features/choreographies/write-flow.js';
import * as reads from '../../features/choreographies/read-flow.ts';
import {
  prepareChoreographyReadId,
  prepareDuplicateQuery,
  preparePagination,
  prepareSearchQuery,
} from '../../features/choreographies/read-validation.ts';
import * as figures from '../../features/step-figures/flow.ts';
import { validateFigure } from '../../features/step-figures/operations.ts';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearAllTables();
  await runQuery('DELETE FROM personal_data.choreography_tags');
  await runQuery('DELETE FROM personal_data.tags');
  await runQuery('DELETE FROM personal_data.choreography_ratings');
});

describe('choreography integration flows', () => {
  it('creates, searches, updates and removes related records', async () => {
    const created = await choreography.createChoreography({
      name: 'Dance',
      level: 'BEGINNER',
      authors: ['Jane'],
      tags: ['Fun'],
      step_figures: ['Kick'],
      choreography_information: [{ category: 'Intro', description: ' Start ' }],
    });
    const result = await reads.searchChoreographies(
      prepareSearchQuery({ search: 'dance', tags: ['Fun'] }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: created.value,
      authors: ['Jane'],
      tags: ['Fun'],
      step_figures: ['Kick'],
      choreography_information: [{ category: 'Intro', description: 'Start' }],
    });
    expect(
      await reads.checkDuplicates(
        prepareDuplicateQuery({ name: 'dance', level: 'BEGINNER', authors: 'jane' }),
      ),
    ).toMatchObject([{ id: created.value, authors: ['Jane'] }]);
    expect(
      await choreography.updateChoreography(created.value, { name: 'Renamed', tags: ['New'] }),
    ).toEqual({ value: true });
    expect(
      (await reads.getChoreography(prepareChoreographyReadId({ id: String(created.value) }).value))
        .value,
    ).toMatchObject({
      name: 'Renamed',
      authors: ['Jane'],
      tags: ['New'],
    });
    expect(await choreography.deleteChoreography(created.value)).toEqual({ value: true });
    expect(
      await reads.getChoreography(prepareChoreographyReadId({ id: String(created.value) }).value),
    ).toEqual({ error: 'not_found' });
  });

  it('returns field issues and rolls back a failed relationship write', async () => {
    expect(await choreography.createChoreography({ name: 'Dance', level: 'not a level' })).toEqual({
      error: 'validation',
      issues: [{ field: 'level', key: 'invalid_level' }],
    });
    await runQuery(
      "CREATE TEMP TRIGGER fail_choreography_author BEFORE INSERT ON choreography_authors BEGIN SELECT RAISE(ABORT, 'Author failure'); END",
    );
    try {
      await expect(
        choreography.createChoreography({ name: 'Dance', level: 'BEGINNER', authors: ['Jane'] }),
      ).rejects.toThrow('Author failure');
      expect((await reads.listChoreographies(preparePagination({}))).data).toEqual([]);
      expect(
        await reads.checkDuplicates(
          prepareDuplicateQuery({ name: 'Dance', level: 'BEGINNER', authors: ['Jane'] }),
        ),
      ).toEqual([]);
    } finally {
      await runQuery('DROP TRIGGER fail_choreography_author');
    }
  });

  it('expands hierarchy for exact searches and filters on attached tags', async () => {
    const first = await figures.createFigure(validateFigure({ name: 'First' }));
    const second = await figures.createFigure(validateFigure({ name: 'Second' }));
    await figures.createFigure(
      validateFigure({
        name: 'Combined',
        component_ids: [first.value.id, second.value.id],
      }),
    );
    const created = await choreography.createChoreography({
      name: 'Composite Dance',
      level: 'BEGINNER',
      step_figures: ['Combined'],
      tags: ['Fun'],
    });
    const result = await reads.searchChoreographies(
      prepareSearchQuery({
        step_figures: ['First', 'Second'],
        step_figures_match_mode: 'exact',
        tags: ['Fun'],
      }),
    );
    expect(result.data.map((item) => item.id)).toEqual([created.value]);
    expect(
      await reads.searchChoreographies(
        prepareSearchQuery({
          step_figures: ['First'],
          step_figures_match_mode: 'exact',
        }),
      ),
    ).toMatchObject({ data: [], pagination: { total: 0 } });
  });

  it('combines exact hierarchy matching with ratings, relationships and exclusions', async () => {
    const first = await figures.createFigure(validateFigure({ name: 'First' }));
    const second = await figures.createFigure(validateFigure({ name: 'Second' }));
    await figures.createFigure(
      validateFigure({ name: 'Combined', component_ids: [first.value.id, second.value.id] }),
    );
    const match = await choreography.createChoreography({
      name: 'Dance match',
      level: 'BEGINNER',
      authors: ['Alice'],
      tags: ['Fun'],
      step_figures: ['Combined'],
    });
    const excluded = await choreography.createChoreography({
      name: 'Dance excluded',
      level: 'BEGINNER',
      authors: ['Alice'],
      tags: ['Fun', 'Bad'],
      step_figures: ['Combined'],
    });
    await runQuery(
      'INSERT INTO personal_data.choreography_ratings (choreography_id, rating) VALUES (?, 4), (?, 4)',
      [match.value, excluded.value],
    );

    const result = await reads.searchChoreographies(
      prepareSearchQuery({
        search: 'dance',
        level: ['BEGINNER'],
        step_figures: ['First', 'Second'],
        step_figures_match_mode: 'exact',
        required_step_figures: ['Combined'],
        authors: ['Alice'],
        tags: ['Fun'],
        excluded_tags: ['Bad'],
        min_rating: '3',
      }),
    );
    expect(result.data.map((item) => item.id)).toEqual([match.value]);
  });
});
