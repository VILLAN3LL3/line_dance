export type RearrangementSession = { id: number; dance_course_id: number };
export type RearrangementMode = 'swap' | 'reorder';
export type RearrangementPlan = { courseId: number; targets: Map<number, number> };
export type RearrangementResult =
  { error: 'session_not_found' | 'different_course' } | { value: RearrangementPlan };

export function serializeAssignment<T extends { is_new: number; auto_repeat: number }>(
  row: T,
): Omit<T, 'is_new' | 'auto_repeat'> & { is_new: boolean; auto_repeat: boolean } {
  return { ...row, is_new: Boolean(row.is_new), auto_repeat: Boolean(row.auto_repeat) };
}

export function planRearrangement(
  sessionIds: number[],
  sessions: RearrangementSession[],
  mode: RearrangementMode,
): RearrangementResult {
  if (sessions.length !== sessionIds.length) return { error: 'session_not_found' };
  if (sessions.some((session) => session.dance_course_id !== sessions[0].dance_course_id)) {
    return { error: 'different_course' };
  }
  const targets =
    mode === 'swap'
      ? new Map<number, number>([
          [sessionIds[0], sessionIds[1]],
          [sessionIds[1], sessionIds[0]],
        ])
      : new Map<number, number>(
          sessionIds.map((sourceId, index) => [sourceId, sessions[index].id]),
        );
  return { value: { courseId: sessions[0].dance_course_id, targets } };
}
