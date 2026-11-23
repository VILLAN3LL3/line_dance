import { z } from 'zod';
import { jsonInput } from '../../utils/json-input.ts';
import type { JsonValue } from '../../utils/json-input.ts';

const requiredValue = jsonInput.refine(Boolean);
const sessionDate = z.iso.date();
const comment = jsonInput.nullish().transform((value) => value ?? null);
const newSession = z
  .object({ dance_course_id: requiredValue, session_date: sessionDate, comment })
  .brand<'NewSession'>();
const sessionUpdate = z.object({ session_date: sessionDate, comment }).brand<'SessionUpdate'>();
const assignment = z
  .object({ session_id: requiredValue, choreography_id: requiredValue })
  .brand<'NewAssignment'>();
const assignmentSong = z
  .object({ song_id: z.number().int().positive().nullable() })
  .brand<'AssignmentSong'>();
const sessionId = requiredValue.brand<'SessionId'>();
const query = z.object({
  dance_course_id: jsonInput.optional(),
  session_id: jsonInput.optional(),
});
const reorder = z.object({
  session_ids: z
    .array(z.number().refine((id) => Number.isSafeInteger(id) && id > 0))
    .min(2)
    .refine((ids) => new Set(ids).size === ids.length),
});
const swapParams = z.object({ sessionId: z.string(), targetSessionId: z.string() });

export type NewSession = z.output<typeof newSession>;
export type SessionUpdate = z.output<typeof sessionUpdate>;
export type NewAssignment = z.output<typeof assignment>;
export type SessionId = z.output<typeof sessionId>;
export type AssignmentSong = z.output<typeof assignmentSong>;
export type NewSessionResult =
  { error: 'course_and_date_required' | 'invalid_session_date' } | { value: NewSession };
export type SessionUpdateResult =
  { error: 'date_required' | 'invalid_session_date' } | { value: SessionUpdate };
export type AssignmentResult = { error: 'assignment_ids_required' } | { value: NewAssignment };
export type AssignmentSongResult = { error: 'invalid_song' } | { value: AssignmentSong };
export type SessionIdResult = { error: 'session_id_required' } | { value: SessionId };
export type ReorderResult = { error: 'invalid_reorder_ids' } | { value: number[] };
export type SwapResult = { error: 'invalid_swap_ids' } | { value: [number, number] };

function requireBody(input: unknown): unknown {
  if (input === null || input === undefined) throw new TypeError('Session input is missing');
  return input;
}

export function validateNewSession(input: unknown): NewSessionResult {
  const body = requireBody(input);
  const parsed = newSession.safeParse(body);
  if (parsed.success) return { value: parsed.data };
  const required = z
    .object({ dance_course_id: requiredValue, session_date: requiredValue })
    .safeParse(body);
  return { error: required.success ? 'invalid_session_date' : 'course_and_date_required' };
}

export function validateSessionUpdate(input: unknown): SessionUpdateResult {
  const body = requireBody(input);
  const parsed = sessionUpdate.safeParse(body);
  if (parsed.success) return { value: parsed.data };
  const required = z.object({ session_date: requiredValue }).safeParse(body);
  return { error: required.success ? 'invalid_session_date' : 'date_required' };
}

export function validateSessionId(input: unknown): SessionIdResult {
  const parsed = sessionId.safeParse(input);
  return parsed.success ? { value: parsed.data } : { error: 'session_id_required' };
}

export function validateAssignment(input: unknown): AssignmentResult {
  const parsed = assignment.safeParse(requireBody(input));
  return parsed.success ? { value: parsed.data } : { error: 'assignment_ids_required' };
}

export function validateAssignmentSong(input: unknown): AssignmentSongResult {
  const parsed = assignmentSong.safeParse(requireBody(input));
  return parsed.success ? { value: parsed.data } : { error: 'invalid_song' };
}

export function validateReorder(input: unknown): ReorderResult {
  const parsed = reorder.safeParse(input);
  return parsed.success ? { value: parsed.data.session_ids } : { error: 'invalid_reorder_ids' };
}

export function validateSwap(firstId: string, secondId: string): SwapResult {
  const first = Number.parseInt(firstId, 10);
  const second = Number.parseInt(secondId, 10);
  if (!Number.isFinite(first) || !Number.isFinite(second) || first === second) {
    return { error: 'invalid_swap_ids' };
  }
  return { value: [first, second] };
}

export function prepareSessionFilter(input: unknown): { value: JsonValue | undefined } {
  return { value: query.parse(input).dance_course_id };
}

export function prepareAssignmentSession(input: unknown): SessionIdResult {
  return validateSessionId(query.parse(input).session_id);
}

export function prepareSwap(input: unknown): SwapResult {
  const { sessionId: first, targetSessionId: second } = swapParams.parse(input);
  return validateSwap(first, second);
}
