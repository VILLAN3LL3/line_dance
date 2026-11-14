import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { clearChoreographyTables, setupChoreographyTestDb } from '../setup/testChoreographyDb.js';
import app from '../setup/testChoreographyApp.js';

beforeAll(async () => {
  await setupChoreographyTestDb();
});

beforeEach(async () => {
  await clearChoreographyTables();
});

async function createStepFigure(
  name: string,
  component_ids: number[] = [],
): Promise<request.Response> {
  return request(app).post('/api/step_figures').send({ name, component_ids });
}

async function createChoreographyWithFigure(stepFigureName: string): Promise<request.Response> {
  return request(app)
    .post('/api/choreographies')
    .send({
      name: 'Hierarchy Dance',
      level: 'Beginner',
      step_figures: [stepFigureName],
    });
}

describe('step figure hierarchy endpoints', () => {
  it('rejects concurrent case-insensitive duplicate names', async () => {
    const responses = await Promise.all([
      createStepFigure('Grapevine'),
      createStepFigure('grapevine'),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    const figures = await request(app).get('/api/step_figures');
    expect(figures.body).toHaveLength(1);
    expect(figures.body[0].toLowerCase()).toBe('grapevine');
  });

  it('rejects concurrent renames to the same case-insensitive name', async () => {
    const first = await createStepFigure('First');
    const second = await createStepFigure('Second');
    const responses = await Promise.all([
      request(app).put(`/api/step_figures/${first.body.id}`).send({ name: 'Grapevine' }),
      request(app).put(`/api/step_figures/${second.body.id}`).send({ name: 'grapevine' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    const figures = await request(app).get('/api/step_figures');
    expect(figures.body.filter((name: string) => name.toLowerCase() === 'grapevine')).toHaveLength(
      1,
    );
  });

  it('creates a step figure with components and returns hierarchy details', async () => {
    const rock = await createStepFigure('Rock Step');
    const weave = await createStepFigure('Weave');

    const combo = await createStepFigure('Rock And Weave', [rock.body.id, weave.body.id]);

    expect(combo.status).toBe(201);
    expect(combo.body.name).toBe('Rock And Weave');
    expect(combo.body.components.map((component: { name: string }) => component.name)).toEqual([
      'Rock Step',
      'Weave',
    ]);
    expect(combo.body.parents).toEqual([]);
  });

  it('lists hierarchy data with parent and child relationships', async () => {
    const rock = await createStepFigure('Rock Step');
    const weave = await createStepFigure('Weave');
    await createStepFigure('Rock And Weave', [rock.body.id, weave.body.id]);

    const res = await request(app).get('/api/step_figures/hierarchy');

    expect(res.status).toBe(200);

    const composite = res.body.find((figure: { name: string }) => figure.name === 'Rock And Weave');
    const child = res.body.find((figure: { name: string }) => figure.name === 'Rock Step');

    expect(composite.components.map((component: { name: string }) => component.name)).toEqual([
      'Rock Step',
      'Weave',
    ]);
    expect(child.parents.map((parent: { name: string }) => parent.name)).toEqual([
      'Rock And Weave',
    ]);
  });

  it('updates a step figure name and component list', async () => {
    const rock = await createStepFigure('Rock Step');
    const weave = await createStepFigure('Weave');
    const kick = await createStepFigure('Kick');
    const combo = await createStepFigure('Combo', [rock.body.id, weave.body.id]);

    const res = await request(app)
      .put(`/api/step_figures/${combo.body.id}`)
      .send({
        name: 'Combo Updated',
        component_ids: [kick.body.id],
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Combo Updated');
    expect(res.body.components.map((component: { name: string }) => component.name)).toEqual([
      'Kick',
    ]);
  });

  it('rejects cyclic hierarchies', async () => {
    const parent = await createStepFigure('Parent');
    const child = await createStepFigure('Child', [parent.body.id]);

    const res = await request(app)
      .put(`/api/step_figures/${parent.body.id}`)
      .send({
        name: 'Parent',
        component_ids: [child.body.id],
      });

    expect(child.status).toBe(201);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot contain cycles/i);
  });

  it('prioritizes invalid and missing IDs over invalid request bodies', async () => {
    const invalid = await request(app).put('/api/step_figures/invalid').send({ name: '' });
    const missing = await request(app).put('/api/step_figures/99999').send({ name: '' });
    const figure = await createStepFigure('Existing');
    const invalidBody = await request(app)
      .put(`/api/step_figures/${figure.body.id}`)
      .send({ name: '' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Invalid step figure id');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('Step figure not found');
    expect(invalidBody.status).toBe(400);
    expect(invalidBody.body.error).toBe('Step figure name is required');
  });

  it('preserves error precedence when component ID conversion fails', async () => {
    const body = { name: 'Figure', component_ids: [{ toString: null }] };
    const invalid = await request(app).put('/api/step_figures/invalid').send(body);
    const missing = await request(app).put('/api/step_figures/99999').send(body);
    const nameError = await request(app)
      .post('/api/step_figures')
      .send({ ...body, name: '' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Invalid step figure id');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('Step figure not found');
    expect(nameError.status).toBe(400);
    expect(nameError.body.error).toBe('Step figure name is required');
  });

  it('prevents deleting step figures that are still used by choreographies or parents', async () => {
    const base = await createStepFigure('Base Figure');
    const composite = await createStepFigure('Composite Figure', [base.body.id]);
    await createChoreographyWithFigure(composite.body.name);

    const usedByParent = await request(app).delete(`/api/step_figures/${base.body.id}`);
    const usedByChoreography = await request(app).delete(`/api/step_figures/${composite.body.id}`);

    expect(usedByParent.status).toBe(409);
    expect(usedByParent.body.error).toMatch(/used as a component/i);
    expect(usedByChoreography.status).toBe(409);
    expect(usedByChoreography.body.error).toMatch(/assigned to choreographies/i);
  });

  it('deletes an unreferenced step figure', async () => {
    const figure = await createStepFigure('Disposable Figure');

    const del = await request(app).delete(`/api/step_figures/${figure.body.id}`);
    const list = await request(app).get('/api/step_figures');

    expect(del.status).toBe(200);
    expect(list.body).toEqual([]);
  });
});
