export type RearrangementSession = { id: number; dance_course_id: number };
export type RearrangementMode = 'swap' | 'reorder';
export type RearrangementPlan = { courseId: number; targets: Map<number, number> };
export type RearrangementResult =
  { error: 'session_not_found' | 'different_course' } | { value: RearrangementPlan };

export function hasOverlappingCourse(
  courseId: number,
  date: string,
  sessions: { dance_course_id: number; session_date: string }[],
): boolean {
  const ranges = new Map<number, { start: string; end: string }>();
  for (const session of [...sessions, { dance_course_id: courseId, session_date: date }]) {
    const day = session.session_date.slice(0, 10);
    const range = ranges.get(session.dance_course_id);
    if (!range) ranges.set(session.dance_course_id, { start: day, end: day });
    else {
      if (day < range.start) range.start = day;
      if (day > range.end) range.end = day;
    }
  }
  const current = ranges.get(courseId);
  if (!current) throw new Error('Current course range is missing');
  return [...ranges].some(
    ([id, range]) => id !== courseId && current.start <= range.end && range.start <= current.end,
  );
}

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
