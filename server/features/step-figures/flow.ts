import {
  buildHierarchy,
  checkFigureUsage,
  validateExistingComponents,
  validateFigureId,
  validateNoSelfComponent,
} from './operations.ts';
import type { Figure, FigureInput, HierarchyFigure } from './operations.ts';
import * as figures from './repository.ts';

type ComponentError = 'self_component' | 'missing_component' | 'cycle';
type FigureError = 'invalid_id' | 'name_required' | 'not_found' | 'duplicate' | ComponentError;
type CreateResult = { error: FigureError } | { value: HierarchyFigure | null };
type DeleteResult =
  | { error: 'invalid_id' | 'not_found' | 'used_by_choreography' | 'used_as_component' }
  | { value: true };
export type FigureRequest = FigureInput | { exception: TypeError | RangeError };

class InvalidComponents extends Error {
  readonly code: ComponentError;

  constructor(code: ComponentError) {
    super(code);
    this.code = code;
  }
}

async function validateComponents(
  parentId: number,
  componentIds: number[],
): Promise<{ error: ComponentError } | { value: true }> {
  const self = validateNoSelfComponent(parentId, componentIds);
  if ('error' in self) return self;
  const existing = await figures.findFigures(componentIds);
  const found = validateExistingComponents(componentIds, existing);
  if ('error' in found) return found;
  for (const componentId of componentIds) {
    if (await figures.findCycle(componentId, parentId)) return { error: 'cycle' };
  }
  return { value: true };
}

async function replaceComponents(parentId: number, componentIds: number[]): Promise<void> {
  await figures.deleteComponents(parentId);
  await componentIds.reduce<Promise<void>>(
    (pending, componentId, index) =>
      pending.then(async () => {
        await figures.insertComponent(parentId, componentId, index);
      }),
    Promise.resolve(),
  );
}

export async function getFigureNames(): Promise<string[]> {
  return (await figures.listFigureNames()).map((figure) => figure.name);
}

export async function getFigures(): Promise<Figure[]> {
  return figures.listFigures();
}

export async function getHierarchy(): Promise<HierarchyFigure[]> {
  const figureRows = await figures.listFigureUsage();
  const relations = await figures.listFigureRelations();
  return buildHierarchy(figureRows, relations);
}

async function getDetail(id: number): Promise<HierarchyFigure | null> {
  return (await getHierarchy()).find((figure) => figure.id === id) || null;
}

export async function createFigure(input: FigureRequest): Promise<CreateResult> {
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  const { name, componentIds } = input.value;
  try {
    return await figures.withFigureTransaction(async () => {
      if (await figures.findDuplicate(name)) return { error: 'duplicate' };
      const created = await figures.insertFigure(name);
      if ('error' in created) return created;
      const components = await validateComponents(created.id, componentIds);
      if ('error' in components) throw new InvalidComponents(components.error);
      await replaceComponents(created.id, componentIds);
      return { value: await getDetail(created.id) };
    });
  } catch (error) {
    if (error instanceof InvalidComponents) return { error: error.code };
    throw error;
  }
}

export async function updateFigure(rawId: string, input: FigureRequest): Promise<CreateResult> {
  const id = validateFigureId(rawId);
  if ('error' in id) return id;
  if (!(await figures.findFigure(id.value))) return { error: 'not_found' };
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  const { name, componentIds } = input.value;
  return figures.withFigureTransaction(async () => {
    if (!(await figures.findFigure(id.value))) return { error: 'not_found' };
    if (await figures.findDuplicate(name, id.value)) return { error: 'duplicate' };
    const components = await validateComponents(id.value, componentIds);
    if ('error' in components) return components;
    await figures.renameFigure(id.value, name);
    await replaceComponents(id.value, componentIds);
    return { value: await getDetail(id.value) };
  });
}

export async function deleteFigure(rawId: string): Promise<DeleteResult> {
  const id = validateFigureId(rawId);
  if ('error' in id) return id;
  return figures.withFigureTransaction(async () => {
    if (!(await figures.findFigure(id.value))) return { error: 'not_found' };
    const usage = checkFigureUsage(await figures.findUsage(id.value));
    if ('error' in usage) return usage;
    await figures.deleteComponents(id.value);
    await figures.deleteParentReferences(id.value);
    await figures.deleteFigure(id.value);
    return { value: true };
  });
}
