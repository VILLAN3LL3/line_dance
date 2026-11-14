import {
  buildHierarchy,
  checkFigureUsage,
  validateExistingComponents,
  validateFigure,
  validateFigureId,
  validateNoSelfComponent,
} from './operations.js';
import * as figures from './repository.js';

class InvalidComponents extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

async function validateComponents(parentId, componentIds) {
  const self = validateNoSelfComponent(parentId, componentIds);
  if (self.error) return self;
  const existing = await figures.findFigures(componentIds);
  const found = validateExistingComponents(componentIds, existing);
  if (found.error) return found;
  for (const componentId of componentIds) {
    if (await figures.findCycle(componentId, parentId)) return { error: 'cycle' };
  }
  return { value: true };
}

async function replaceComponents(parentId, componentIds) {
  await figures.deleteComponents(parentId);
  await componentIds.reduce(
    (pending, componentId, index) =>
      pending.then(() => figures.insertComponent(parentId, componentId, index)),
    Promise.resolve(),
  );
}

export async function getFigureNames() {
  return (await figures.listFigureNames()).map((figure) => figure.name);
}

export function getFigures() {
  return figures.listFigures();
}

export async function getHierarchy() {
  const figureRows = await figures.listFigureUsage();
  const relations = await figures.listFigureRelations();
  return buildHierarchy(figureRows, relations);
}

async function getDetail(id) {
  return (await getHierarchy()).find((figure) => figure.id === id) || null;
}

export async function createFigure(input) {
  const validation = validateFigure(input);
  if (validation.error) return validation;
  const { name, componentIds } = validation.value;
  try {
    return await figures.withFigureTransaction(async () => {
      if (await figures.findDuplicate(name)) return { error: 'duplicate' };
      const created = await figures.insertFigure(name);
      if (created.error) return created;
      const components = await validateComponents(created.id, componentIds);
      if (components.error) throw new InvalidComponents(components.error);
      await replaceComponents(created.id, componentIds);
      return { value: await getDetail(created.id) };
    });
  } catch (error) {
    if (error instanceof InvalidComponents) return { error: error.code };
    throw error;
  }
}

export async function updateFigure(rawId, input) {
  const id = validateFigureId(rawId);
  if (id.error) return id;
  if (!(await figures.findFigure(id.value))) return { error: 'not_found' };
  const validation = validateFigure(input);
  if (validation.error) return validation;
  const { name, componentIds } = validation.value;
  return figures.withFigureTransaction(async () => {
    if (!(await figures.findFigure(id.value))) return { error: 'not_found' };
    if (await figures.findDuplicate(name, id.value)) return { error: 'duplicate' };
    const components = await validateComponents(id.value, componentIds);
    if (components.error) return components;
    await figures.renameFigure(id.value, name);
    await replaceComponents(id.value, componentIds);
    return { value: await getDetail(id.value) };
  });
}

export async function deleteFigure(rawId) {
  const id = validateFigureId(rawId);
  if (id.error) return id;
  return figures.withFigureTransaction(async () => {
    if (!(await figures.findFigure(id.value))) return { error: 'not_found' };
    const usage = checkFigureUsage(await figures.findUsage(id.value));
    if (usage.error) return usage;
    await figures.deleteComponents(id.value);
    await figures.deleteParentReferences(id.value);
    await figures.deleteFigure(id.value);
    return { value: true };
  });
}
