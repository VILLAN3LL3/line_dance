import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sqlite3 from 'sqlite3';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { runChoreographyMigrations } from '../../migrations/choreography-migrations.ts';
import { runDanceGroupsMigrations } from '../../migrations/dance-groups-migrations.ts';
import { allQuery, closeDatabase, runQuery, setDatabaseConnection } from '../../scripts/db.ts';
import app from '../setup/testApp.js';

let directory: string;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'line-dance-group-flow-'));
  setDatabaseConnection('choreography', new sqlite3.Database(join(directory, 'choreography.db')));
  setDatabaseConnection('danceGroups', new sqlite3.Database(join(directory, 'dance-groups.db')));
  await runQuery('ATTACH DATABASE ? AS personal_data', [join(directory, 'personal-data.db')]);
  await runChoreographyMigrations();
  await runDanceGroupsMigrations();
});

afterAll(async () => {
  await closeDatabase();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

it('creates and updates group figures across separate database files', async () => {
  const kick = await request(app).post('/api/step_figures').send({ name: 'Kick' });
  const mambo = await request(app).post('/api/step_figures').send({ name: 'Mambo' });
  expect(kick.status).toBe(201);
  expect(mambo.status).toBe(201);

  const group = await request(app).post('/api/dance-groups').send({ name: 'Separate DB' });
  expect(group.status).toBe(201);
  const defaults = await request(app).get(`/api/dance-groups/${group.body.id}/base-step-figures`);
  expect(defaults.body).toEqual([{ id: kick.body.id, name: 'Kick' }]);

  const updated = await request(app)
    .put(`/api/dance-groups/${group.body.id}/base-step-figures`)
    .send({ step_figure_ids: [mambo.body.id] });
  expect(updated.status).toBe(200);
  expect(updated.body).toEqual([{ id: mambo.body.id, name: 'Mambo' }]);

  const choreography = await request(app)
    .post('/api/choreographies')
    .send({
      name: 'Mambo Dance',
      level: 'Beginner',
      step_figures: ['Mambo'],
      tags: ['Favourite'],
    });
  expect(choreography.status).toBe(201);
  const known = await request(app).get(
    `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
  );
  expect(known.body).toEqual([]);

  await request(app)
    .put(`/api/dance-groups/${group.body.id}/base-step-figures`)
    .send({ step_figure_ids: [] });
  const suggestions = await request(app).get(
    `/api/dance-groups/${group.body.id}/step-figure-suggestions`,
  );
  expect(suggestions.status).toBe(200);
  expect(suggestions.body).toEqual([{ step_figure: 'Mambo', additional_choreographies: 1 }]);
});

it('applies each migration once when migration runners overlap', async () => {
  const cases: ['choreography' | 'danceGroups', string, () => Promise<void>][] = [
    ['choreography', '014_drop_legacy_choreography_information_columns', runChoreographyMigrations],
    ['danceGroups', '014_backfill_planned_session_repetitions', runDanceGroupsMigrations],
  ];
  for (const [database, migrationId, migrate] of cases) {
    await runQuery('DELETE FROM schema_migrations WHERE id = ?', [migrationId], database);
    const results = await Promise.allSettled([migrate(), migrate()]);
    expect(results).toEqual([
      { status: 'fulfilled', value: undefined },
      { status: 'fulfilled', value: undefined },
    ]);
    expect(
      await allQuery('SELECT id FROM schema_migrations WHERE id = ?', [migrationId], database),
    ).toEqual([{ id: migrationId }]);
  }
});
