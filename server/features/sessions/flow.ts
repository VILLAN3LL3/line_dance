import { rearrangeSessionContents } from './content-flow.ts';
import { hasOverlappingCourse, serializeAssignment } from './operations.ts';
import * as sessions from './repository.ts';
import type { AssignmentRow, Session } from './repository.ts';
import type { JsonValue } from '../../utils/json-input.ts';
import { distributeRepetitions } from './repetition-repository.ts';
import type {
  AssignmentResult,
  NewSessionResult,
  ReorderResult,
  SessionIdResult,
  SessionUpdateResult,
  SwapResult,
} from './validation.ts';

export type SessionError =
  | 'course_and_date_required'
  | 'date_required'
  | 'invalid_session_date'
  | 'course_not_found'
  | 'session_not_found'
  | 'course_overlap'
  | 'session_id_required'
  | 'assignment_ids_required'
  | 'duplicate_assignment'
  | 'assignment_not_found'
  | 'invalid_reorder_ids'
  | 'invalid_swap_ids'
  | 'different_course';
type Result<T> = { error: SessionError } | { value: T };
export type Assignment = Omit<AssignmentRow, 'is_new' | 'auto_repeat'> & {
  is_new: boolean;
  auto_repeat: boolean;
};

export async function getSessions(courseId: JsonValue | undefined): Promise<Session[]> {
  return sessions.listSessions(courseId);
}

export async function createSession(
  validation: NewSessionResult,
): Promise<Result<Session | undefined>> {
  if ('error' in validation) return validation;
  return sessions.withSessionTransaction(async () => {
    const course = await sessions.findCourse(validation.value.dance_course_id);
    if (!course) return { error: 'course_not_found' };
    const dates = await sessions.listGroupSessionDates(course.id, null);
    if (hasOverlappingCourse(course.id, validation.value.session_date, dates)) {
      return { error: 'course_overlap' };
    }
    const result = await sessions.insertSession(validation.value);
    return { value: await sessions.findSession(result.id) };
  });
}

export async function updateSession(
  id: string | number,
  validation: SessionUpdateResult,
): Promise<Result<Session | undefined>> {
  if ('error' in validation) return validation;
  return sessions.withSessionTransaction(async () => {
    const existing = await sessions.findSession(id);
    if (!existing) return { error: 'session_not_found' };
    if (existing.session_date !== validation.value.session_date) {
      const dates = await sessions.listGroupSessionDates(existing.dance_course_id, id);
      if (hasOverlappingCourse(existing.dance_course_id, validation.value.session_date, dates)) {
        return { error: 'course_overlap' };
      }
    }
    await sessions.saveSession(id, validation.value);
    return { value: await sessions.findSession(id) };
  });
}

export async function deleteSession(id: string | number): Promise<Result<true>> {
  return (await sessions.deleteSession(id)) ? { value: true } : { error: 'session_not_found' };
}

export async function getAssignments(validation: SessionIdResult): Promise<Result<Assignment[]>> {
  if ('error' in validation) return validation;
  const rows = await sessions.listAssignments(validation.value);
  return { value: rows.map(serializeAssignment) };
}

export async function addAssignment(validation: AssignmentResult): Promise<Result<Assignment>> {
  if ('error' in validation) return validation;
  const { session_id, choreography_id } = validation.value;
  return sessions.withSessionTransaction(async () => {
    const session = await sessions.findSession(session_id);
    if (!session) return { error: 'session_not_found' };
    const result = await sessions.insertAssignment(session_id, choreography_id);
    if ('error' in result) return result;
    await distributeRepetitions(session.dance_course_id, result.id);
    const saved = await sessions.findAssignment(result.id);
    if (!saved) throw new Error('Inserted session choreography not found');
    return { value: serializeAssignment(saved) };
  });
}

export async function removeAssignment(id: string | number): Promise<Result<true>> {
  return (await sessions.deleteAssignment(id))
    ? { value: true }
    : { error: 'assignment_not_found' };
}

export async function reorderContents(validation: ReorderResult): Promise<Result<true>> {
  return 'error' in validation ? validation : rearrangeSessionContents(validation.value, 'reorder');
}

export async function swapContents(validation: SwapResult): Promise<Result<true>> {
  return 'error' in validation ? validation : rearrangeSessionContents(validation.value, 'swap');
}
