import { z } from 'zod';
import { normalizeIdArray } from '../../utils/choreographyNormalization.ts';

const figureName = z.string().trim().min(1).brand<'FigureName'>();
const figureBody = z.object({ name: figureName, component_ids: z.unknown().optional() });
type UsageCount = number | string | null;

export interface Figure {
  id: number;
  name: string;
}
export interface FigureUsage extends Figure {
  used_by_choreography_count?: UsageCount;
}
export interface FigureRelation {
  parent_step_figure_id: number;
  child_step_figure_id: number;
  parent_name: string;
  child_name: string;
}
export interface FigureCounts {
  choreography_usage_count?: UsageCount;
  parent_count?: UsageCount;
}
export interface HierarchyFigure extends Figure {
  components: Figure[];
  parents: Figure[];
  used_by_choreography_count: number;
}
export type FigureInput =
  | { error: 'name_required' }
  | { value: { name: z.output<typeof figureName>; componentIds: number[] } };
type CheckResult<E extends string> = { error: E } | { value: true };

export function validateFigureId(rawId: string): { error: 'invalid_id' } | { value: number } {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? { error: 'invalid_id' } : { value: id };
}

export function validateFigure(input: unknown): FigureInput {
  const parsed = figureBody.safeParse(input);
  if (!parsed.success) return { error: 'name_required' };
  return {
    value: { name: parsed.data.name, componentIds: normalizeIdArray(parsed.data.component_ids) },
  };
}

export function validateNoSelfComponent(
  parentId: number,
  componentIds: number[],
): CheckResult<'self_component'> {
  return componentIds.includes(parentId) ? { error: 'self_component' } : { value: true };
}

export function validateExistingComponents(
  componentIds: number[],
  existingIds: Pick<Figure, 'id'>[],
): CheckResult<'missing_component'> {
  return existingIds.length !== componentIds.length
    ? { error: 'missing_component' }
    : { value: true };
}

export function checkFigureUsage(
  usage: FigureCounts | undefined,
): CheckResult<'used_by_choreography' | 'used_as_component'> {
  if (Number(usage?.choreography_usage_count || 0) > 0) return { error: 'used_by_choreography' };
  if (Number(usage?.parent_count || 0) > 0) return { error: 'used_as_component' };
  return { value: true };
}

export function buildHierarchy(
  figures: FigureUsage[],
  relations: FigureRelation[],
): HierarchyFigure[] {
  const byId = new Map<number, HierarchyFigure>(
    figures.map((figure) => [
      figure.id,
      {
        id: figure.id,
        name: figure.name,
        components: [],
        parents: [],
        used_by_choreography_count: Number(figure.used_by_choreography_count || 0),
      },
    ]),
  );
  for (const relation of relations) {
    const parent = byId.get(relation.parent_step_figure_id);
    const child = byId.get(relation.child_step_figure_id);
    if (parent)
      parent.components.push({ id: relation.child_step_figure_id, name: relation.child_name });
    if (child)
      child.parents.push({ id: relation.parent_step_figure_id, name: relation.parent_name });
  }
  return Array.from(byId.values());
}
