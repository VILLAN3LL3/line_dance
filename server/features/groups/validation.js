export function validateGroupName(input) {
  const { name } = input;
  if (!name || typeof name !== 'string' || !name.trim()) return { error: 'name_required' };
  return { value: name.trim() };
}

export function validateMaxLevelGroupId(groupId) {
  const parsed = Number.parseInt(groupId, 10);
  if (!groupId || !Number.isFinite(parsed)) return { error: 'valid_group_id_required' };
  return { value: parsed };
}

export function validateBaseFigureGroupId(groupId) {
  const parsed = Number.parseInt(groupId, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return { error: 'invalid_group_id' };
  return { value: parsed };
}

export function validateMaxLevel(input) {
  const value = input?.max_group_level_value;
  if (value === null || value === undefined || value === '') return { value: null };
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return { error: 'invalid_max_level' };
  return { value: parsed };
}

export function validateBaseFigureIds(input) {
  const { step_figure_ids } = input;
  if (
    !Array.isArray(step_figure_ids) ||
    !step_figure_ids.every((id) => Number.isInteger(id) && id > 0)
  ) {
    return { error: 'invalid_figure_ids' };
  }
  return { value: step_figure_ids };
}
