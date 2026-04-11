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

async function createStepFigure(name, component_ids = []) {
  return request(app).post('/api/step_figures').send({ name, component_ids });
}

async function createChoreographyWithFigure(stepFigureName) {
  return request(app).post('/api/choreographies').send({
    name: 'Hierarchy Dance',
    level: 'Beginner',
    step_figures: [stepFigureName],
  });
}

describe('step figure hierarchy endpoints', () => {
  it('creates a step figure with components and returns hierarchy details', async () => {
    const rock = await createStepFigure('Rock Step');
    const weave = await createStepFigure('Weave');

    const combo = await createStepFigure('Rock And Weave', [rock.body.id, weave.body.id]);

    expect(combo.status).toBe(201);
    expect(combo.body.name).toBe('Rock And Weave');
    expect(combo.body.components.map((component) => component.name)).toEqual([
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

    const composite = res.body.find((figure) => figure.name === 'Rock And Weave');
    const child = res.body.find((figure) => figure.name === 'Rock Step');

    expect(composite.components.map((component) => component.name)).toEqual(['Rock Step', 'Weave']);
    expect(child.parents.map((parent) => parent.name)).toEqual(['Rock And Weave']);
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
    expect(res.body.components.map((component) => component.name)).toEqual(['Kick']);
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