import {
  describeIntervalTiers,
  formatLocalDate,
  isFutureDate,
  planBaseline,
  summarizePractice,
} from './operations.ts';
import type { PracticeSummary } from './operations.ts';
import { validateEntryId } from './validation.ts';
import type {
  BaselineValidationResult,
  LogListValidationResult,
  LogPracticeValidationResult,
  PracticeInputError,
} from './validation.ts';
import * as practice from './repository.ts';
import type { PracticeLogEntry } from './repository.ts';

export type LogPracticeRequest =
  LogPracticeValidationResult | { exception: TypeError | RangeError };
export type BaselineRequest = BaselineValidationResult | { exception: TypeError | RangeError };
export type LogListRequest = LogListValidationResult | { exception: TypeError | RangeError };
type LogResult =
  | { error: PracticeInputError | 'not_found' | 'future_date' }
  | { value: { logged: number; practiced_on: string } };
type BaselineResult =
  | { error: PracticeInputError | 'not_found' | 'not_learned' }
  | { value: { updated: number; step: number } };
type ListResult = { error: PracticeInputError } | { value: PracticeLogEntry[] };
type DeleteResult = { error: 'invalid_id' | 'not_found' } | { value: true };

function today(): string {
  return formatLocalDate(new Date());
}

export async function logPractice(input: LogPracticeRequest): Promise<LogResult> {
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  const { choreography_ids: ids, confidence, song_id: songId, note } = input.value;
  const practicedOn = input.value.practiced_on ?? today();
  if (isFutureDate(practicedOn, today())) return { error: 'future_date' };

  return practice.withPracticeTransaction(async () => {
    const existing = await practice.findExistingChoreographyIds(ids);
    if (existing.length !== ids.length) return { error: 'not_found' };
    if (songId !== null && !(await practice.songBelongsToChoreography(ids[0], songId))) {
      return { error: 'invalid_song' };
    }
    await ids.reduce(
      (previous, choreographyId) =>
        previous.then(async () => {
          await practice.insertEntry({ choreographyId, practicedOn, confidence, songId, note });
        }),
      Promise.resolve(),
    );
    return { value: { logged: ids.length, practiced_on: practicedOn } };
  });
}

export async function listPracticeLog(input: LogListRequest): Promise<ListResult> {
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  return { value: await practice.listEntries(input.value.limit) };
}

export async function removePracticeEntry(rawId: string): Promise<DeleteResult> {
  const id = validateEntryId(rawId);
  if ('error' in id) return id;
  const result = await practice.deleteEntry(id.value);
  return result.changes === 0 ? { error: 'not_found' } : { value: true };
}

/** All learned dances with their practice state, the dance that most needs practice first. */
export async function getPracticeSuggestions(): Promise<PracticeSummary[]> {
  const rows = await practice.listLearnedPracticeRows();
  return summarizePractice(rows, today());
}

/** Puts learned dances on an interval step once, e.g. dances learned long before the box existed. */
export async function setPracticeBaseline(input: BaselineRequest): Promise<BaselineResult> {
  if ('exception' in input) throw input.exception;
  if ('error' in input) return input;
  const { choreography_ids: ids, step, spread } = input.value;

  return practice.withPracticeTransaction(async () => {
    const dances = await practice.findBaselineDances(ids);
    if (dances.length !== ids.length) return { error: 'not_found' };
    if (dances.some((dance) => dance.learning_status !== 'learned')) {
      return { error: 'not_learned' };
    }
    const practicedOn = today();
    const plan = planBaseline(dances, step, spread, practicedOn);
    await plan.reduce(
      (previous, entry) =>
        previous.then(async () => {
          await practice.insertBaselineEntry(
            entry.choreography_id,
            practicedOn,
            step,
            entry.due_on,
          );
        }),
      Promise.resolve(),
    );
    return { value: { updated: plan.length, step } };
  });
}

export function getIntervalTiers(): ReturnType<typeof describeIntervalTiers> {
  return describeIntervalTiers();
}
