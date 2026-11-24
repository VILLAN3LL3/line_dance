import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, clearAllTables } from '../setup/testDb.ts';
import { allQuery, runQuery } from '../../scripts/db.ts';
import * as choreography from '../../features/choreographies/write-flow.ts';
import {
  preparePartialWriteRequest,
  prepareWriteRequest,
} from '../../features/choreographies/validation.ts';
import * as reads from '../../features/choreographies/read-flow.ts';
import {
  prepareChoreographyReadId,
  prepareDuplicateQuery,
  preparePagination,
  prepareSearchQuery,
} from '../../features/choreographies/read-validation.ts';
import * as figures from '../../features/step-figures/flow.ts';
import { validateFigure } from '../../features/step-figures/operations.ts';
import type { HierarchyFigure } from '../../features/step-figures/operations.ts';

async function createFigure(name: string, componentIds: number[] = []): Promise<HierarchyFigure> {
  const result = await figures.createFigure(validateFigure({ name, component_ids: componentIds }));
  if ('error' in result || result.value === null) throw new Error('Failed to create test figure');
  return result.value;
}

function createdChoreographyId(
  result: Awaited<ReturnType<typeof choreography.createChoreography>>,
): number {
  if ('error' in result) throw new Error(`Failed to create test choreography: ${result.error}`);
  return result.value;
}

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
    const created = createdChoreographyId(
      await choreography.createChoreography(
        prepareWriteRequest({
          name: 'Dance',
          level: 'BEGINNER',
          authors: ['Jane'],
          tags: ['Fun'],
          step_figures: ['Kick'],
          choreography_information: [{ category: 'Intro', description: ' Start ' }],
        }),
      ),
    );
    const result = await reads.searchChoreographies(
      prepareSearchQuery({ search: 'dance', tags: ['Fun'] }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: created,
      authors: ['Jane'],
      tags: ['Fun'],
      step_figures: ['Kick'],
      choreography_information: [{ category: 'Intro', description: 'Start' }],
    });
    expect(
      await reads.checkDuplicates(
        prepareDuplicateQuery({ name: 'dance', level: 'BEGINNER', authors: 'jane' }),
      ),
    ).toMatchObject([{ id: created, authors: ['Jane'] }]);
    expect(
      await choreography.updateChoreography(
        created,
        preparePartialWriteRequest({ name: 'Renamed', tags: ['New'] }),
      ),
    ).toEqual({ value: created });
    expect(
      await reads.getChoreography(prepareChoreographyReadId({ id: String(created) }).value),
    ).toMatchObject({ value: { name: 'Renamed', authors: ['Jane'], tags: ['New'] } });
    expect(await choreography.deleteChoreography(created)).toEqual({ value: true });
    expect(
      await reads.getChoreography(prepareChoreographyReadId({ id: String(created) }).value),
    ).toEqual({ error: 'not_found' });
  });

  it('returns field issues and rolls back a failed relationship write', async () => {
    expect(
      await choreography.createChoreography(
        prepareWriteRequest({ name: 'Dance', level: 'not a level' }),
      ),
    ).toEqual({
      error: 'validation',
      issues: [{ field: 'level', key: 'invalid_level' }],
    });
    await runQuery(
      "CREATE TEMP TRIGGER fail_choreography_author BEFORE INSERT ON choreography_authors BEGIN SELECT RAISE(ABORT, 'Author failure'); END",
    );
    try {
      await expect(
        choreography.createChoreography(
          prepareWriteRequest({ name: 'Dance', level: 'BEGINNER', authors: ['Jane'] }),
        ),
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

  it('rolls back the choreography and keeps stored songs when a song write fails', async () => {
    const created = createdChoreographyId(
      await choreography.createChoreography(
        prepareWriteRequest({
          name: 'Dance',
          level: 'BEGINNER',
          choreography_songs: [{ title: 'Keep', is_favorite: true }],
        }),
      ),
    );
    await runQuery(
      "CREATE TEMP TRIGGER fail_choreography_song BEFORE INSERT ON choreography_songs BEGIN SELECT RAISE(ABORT, 'Song failure'); END",
    );
    try {
      await expect(
        choreography.createChoreography(
          prepareWriteRequest({
            name: 'Other',
            level: 'BEGINNER',
            choreography_songs: [{ title: 'New' }],
          }),
        ),
      ).rejects.toThrow('Song failure');
      await expect(
        choreography.updateChoreography(
          created,
          preparePartialWriteRequest({
            name: 'Dance',
            choreography_songs: [{ title: 'Replaced' }],
          }),
        ),
      ).rejects.toThrow('Song failure');
    } finally {
      await runQuery('DROP TRIGGER fail_choreography_song');
    }

    const { data } = await reads.listChoreographies(preparePagination({}));
    expect(data.map((dance) => dance.name)).toEqual(['Dance']);
    expect(data[0].choreography_songs).toMatchObject([{ title: 'Keep', is_favorite: true }]);
  });

  it('rolls back a newly created genre when the song write fails', async () => {
    await runQuery(
      "CREATE TEMP TRIGGER fail_choreography_song BEFORE INSERT ON choreography_songs BEGIN SELECT RAISE(ABORT, 'Song failure'); END",
    );
    try {
      await expect(
        choreography.createChoreography(
          prepareWriteRequest({
            name: 'Dance',
            level: 'BEGINNER',
            choreography_songs: [{ title: 'New', bpm: 120, genre: 'Country' }],
          }),
        ),
      ).rejects.toThrow('Song failure');
    } finally {
      await runQuery('DROP TRIGGER fail_choreography_song');
    }

    expect(await allQuery('SELECT name FROM genres')).toEqual([]);
  });

  it('expands hierarchy for exact searches and filters on attached tags', async () => {
    const first = await createFigure('First');
    const second = await createFigure('Second');
    await createFigure('Combined', [first.id, second.id]);
    const created = createdChoreographyId(
      await choreography.createChoreography(
        prepareWriteRequest({
          name: 'Composite Dance',
          level: 'BEGINNER',
          step_figures: ['Combined'],
          tags: ['Fun'],
        }),
      ),
    );
    const result = await reads.searchChoreographies(
      prepareSearchQuery({
        step_figures: ['First', 'Second'],
        step_figures_match_mode: 'exact',
        tags: ['Fun'],
      }),
    );
    expect(result.data.map((item) => item.id)).toEqual([created]);
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
    const first = await createFigure('First');
    const second = await createFigure('Second');
    await createFigure('Combined', [first.id, second.id]);
    const match = createdChoreographyId(
      await choreography.createChoreography(
        prepareWriteRequest({
          name: 'Dance match',
          level: 'BEGINNER',
          authors: ['Alice'],
          tags: ['Fun'],
          step_figures: ['Combined'],
        }),
      ),
    );
    const excluded = createdChoreographyId(
      await choreography.createChoreography(
        prepareWriteRequest({
          name: 'Dance excluded',
          level: 'BEGINNER',
          authors: ['Alice'],
          tags: ['Fun', 'Bad'],
          step_figures: ['Combined'],
        }),
      ),
    );
    await runQuery(
      'INSERT INTO personal_data.choreography_ratings (choreography_id, rating) VALUES (?, 4), (?, 4)',
      [match, excluded],
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
    expect(result.data.map((item) => item.id)).toEqual([match]);
  });
});
