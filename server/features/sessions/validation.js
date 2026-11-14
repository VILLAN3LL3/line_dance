export function validateNewSession(input) {
  const { dance_course_id, session_date, comment } = input;
  if (!dance_course_id || !session_date) return { error: 'course_and_date_required' };
  return { value: { dance_course_id, session_date, comment: comment ?? null } };
}

export function validateSessionUpdate(input) {
  const { session_date, comment } = input;
  if (!session_date) return { error: 'date_required' };
  return { value: { session_date, comment: comment ?? null } };
}

export function validateSessionId(sessionId) {
  return sessionId ? { value: sessionId } : { error: 'session_id_required' };
}

export function validateAssignment(input) {
  const { session_id, choreography_id } = input;
  if (!session_id || !choreography_id) return { error: 'assignment_ids_required' };
  return { value: { session_id, choreography_id } };
}

export function validateReorder(input) {
  const ids = input?.session_ids;
  if (
    !Array.isArray(ids) ||
    ids.length < 2 ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
    new Set(ids).size !== ids.length
  ) {
    return { error: 'invalid_reorder_ids' };
  }
  return { value: ids };
}

export function validateSwap(firstId, secondId) {
  const first = Number.parseInt(firstId, 10);
  const second = Number.parseInt(secondId, 10);
  if (!Number.isFinite(first) || !Number.isFinite(second) || first === second) {
    return { error: 'invalid_swap_ids' };
  }
  return { value: [first, second] };
}
