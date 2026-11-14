import { normalizeIdArray, normalizeStringField } from '../../utils/choreographyNormalization.ts';

export function validateFigureId(rawId) {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? { error: 'invalid_id' } : { value: id };
}

export function validateFigure(input) {
  const name = normalizeStringField(input?.name);
  if (!name) return { error: 'name_required' };
  return { value: { name, componentIds: normalizeIdArray(input?.component_ids) } };
}

export function validateNoSelfComponent(parentId, componentIds) {
  return componentIds.includes(parentId) ? { error: 'self_component' } : { value: true };
}

export function validateExistingComponents(componentIds, existingIds) {
  return existingIds.length !== componentIds.length
    ? { error: 'missing_component' }
    : { value: true };
}

export function checkFigureUsage(usage) {
  if (Number(usage?.choreography_usage_count || 0) > 0) return { error: 'used_by_choreography' };
  if (Number(usage?.parent_count || 0) > 0) return { error: 'used_as_component' };
  return { value: true };
}

export function buildHierarchy(figures, relations) {
  const byId = new Map(
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
