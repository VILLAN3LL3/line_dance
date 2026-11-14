export function serializeAssignment(row) {
  return { ...row, is_new: Boolean(row.is_new), auto_repeat: Boolean(row.auto_repeat) };
}

export function planRearrangement(sessionIds, sessions, mode) {
  if (sessions.length !== sessionIds.length) return { error: 'session_not_found' };
  if (sessions.some((session) => session.dance_course_id !== sessions[0].dance_course_id)) {
    return { error: 'different_course' };
  }
  const targets =
    mode === 'swap'
      ? new Map([
          [sessionIds[0], sessionIds[1]],
          [sessionIds[1], sessionIds[0]],
        ])
      : new Map(sessionIds.map((sourceId, index) => [sourceId, sessions[index].id]));
  return { value: { courseId: sessions[0].dance_course_id, targets } };
}
