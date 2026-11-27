import { afterEach, describe, expect, it } from 'vitest';
import sqlite3 from 'sqlite3';
import type { Database } from 'sqlite3';

import { allQuery, closeDatabase, runQuery, setDatabaseConnection } from '../../scripts/db.ts';
import { runChoreographyMigrations } from '../../migrations/choreography-migrations.ts';

async function open(): Promise<Database> {
  const db = new sqlite3.Database(':memory:');
  setDatabaseConnection('choreography', db);
  await runQuery("ATTACH DATABASE ':memory:' AS personal_data", [], 'choreography');
  await runChoreographyMigrations();
  return db;
}

afterEach(async () => {
  await closeDatabase();
});

describe('Hip Sway/Hip Bump migration', () => {
  it('merges figure assignments and hierarchy references without duplicates', async () => {
    await open();
    await runQuery(
      `INSERT INTO step_figures (name) VALUES ('Hip Sway'), ('Hip Bump'), ('Composite')`,
    );
    const figures = await allQuery<{ id: number; name: string }>(
      'SELECT id, name FROM step_figures WHERE name IN (?, ?, ?)',
      ['Hip Sway', 'Hip Bump', 'Composite'],
    );
    const swayId = figures.find((figure) => figure.name === 'Hip Sway')?.id;
    const bumpId = figures.find((figure) => figure.name === 'Hip Bump')?.id;
    const compositeId = figures.find((figure) => figure.name === 'Composite')?.id;
    if (swayId === undefined || bumpId === undefined || compositeId === undefined) {
      throw new Error('Expected test step figures to exist');
    }

    await runQuery(
      `INSERT INTO choreographies (name, level_id)
       VALUES ('Both', (SELECT id FROM levels LIMIT 1)),
              ('Sway only', (SELECT id FROM levels LIMIT 1)),
              ('Bump only', (SELECT id FROM levels LIMIT 1))`,
    );
    const dances = await allQuery<{ id: number; name: string }>(
      `SELECT id, name FROM choreographies WHERE name IN (?, ?, ?)`,
      ['Both', 'Sway only', 'Bump only'],
    );
    const danceId = (name: string): number => {
      const dance = dances.find((row) => row.name === name);
      if (!dance) throw new Error(`Expected test choreography "${name}" to exist`);
      return dance.id;
    };

    await runQuery(
      `INSERT INTO choreography_step_figures (choreography_id, step_figure_id)
       VALUES (?, ?), (?, ?), (?, ?), (?, ?)`,
      [
        danceId('Both'),
        swayId,
        danceId('Both'),
        bumpId,
        danceId('Sway only'),
        swayId,
        danceId('Bump only'),
        bumpId,
      ],
    );
    await runQuery(
      `INSERT INTO step_figure_components
         (parent_step_figure_id, child_step_figure_id, sort_order)
       VALUES (?, ?, 0), (?, ?, 1)`,
      [compositeId, swayId, compositeId, bumpId],
    );

    await runQuery("DELETE FROM schema_migrations WHERE id = '022_merge_hip_sway_and_hip_bump'");
    await runChoreographyMigrations();

    expect(
      await allQuery<{ name: string }>(
        `SELECT name FROM step_figures WHERE LOWER(name) LIKE 'hip %'
       ORDER BY name`,
      ),
    ).toEqual([{ name: 'Hip Sway/Hip Bump' }]);
    expect(
      await allQuery<{ dance: string; figure: string }>(
        `SELECT c.name AS dance, sf.name AS figure
         FROM choreography_step_figures csf
         JOIN choreographies c ON c.id = csf.choreography_id
         JOIN step_figures sf ON sf.id = csf.step_figure_id
         ORDER BY c.name`,
      ),
    ).toEqual([
      { dance: 'Both', figure: 'Hip Sway/Hip Bump' },
      { dance: 'Bump only', figure: 'Hip Sway/Hip Bump' },
      { dance: 'Sway only', figure: 'Hip Sway/Hip Bump' },
    ]);
    expect(
      await allQuery<{ child: string }>(
        `SELECT child.name AS child
         FROM step_figure_components component
         JOIN step_figures child ON child.id = component.child_step_figure_id
         WHERE component.parent_step_figure_id = ?`,
        [compositeId],
      ),
    ).toEqual([{ child: 'Hip Sway/Hip Bump' }]);
  });
});
