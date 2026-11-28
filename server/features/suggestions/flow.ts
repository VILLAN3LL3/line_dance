import {
  aggregateSuggestions,
  currentSuggestionDate,
  knownFigureNames,
  uniqueIds,
} from './operations.ts';
import type {
  GroupRequest,
  SessionRequest,
  Suggestion,
  prepareLearnedGroupId,
} from './operations.ts';
import * as suggestions from './repository.ts';

type SessionResult =
  | { error: 'invalid_session_id' | 'session_not_found' | 'course_not_found' }
  | {
      value: {
        suggestions: Suggestion[];
        known_step_figures: string[];
        max_level_value: number | null;
      };
    };

export async function getKnownFigures(
  groupId: number,
  choreographyIds: number[],
): Promise<{ names: string[]; namesLower: string[] }> {
  const baseRows = await suggestions.findBaseFigures(groupId);
  const choreographyRows = await suggestions.findChoreographyFigures(choreographyIds);
  const seedIds = uniqueIds(
    baseRows.map((row) => row.step_figure_id),
    choreographyRows.map((row) => row.id),
  );
  return knownFigureNames(await suggestions.findExpandedFigures(seedIds));
}

export async function getLearnedChoreographies(
  groupId: ReturnType<typeof prepareLearnedGroupId>['value'],
): Promise<Awaited<ReturnType<typeof suggestions.listLearnedChoreographies>>> {
  return suggestions.listLearnedChoreographies(groupId);
}

export async function getGroupSuggestions(
  input: GroupRequest,
): Promise<{ error: 'invalid_group_id' | 'group_not_found' } | { value: Suggestion[] }> {
  if ('error' in input) return input;
  const { id, maxLevel } = input.value;
  if (!(await suggestions.findGroup(id))) return { error: 'group_not_found' };

  const learned = await suggestions.findLearnedChoreographies(
    id,
    currentSuggestionDate(Date.now()),
  );
  const known = await getKnownFigures(
    id,
    learned.map((row) => row.choreography_id),
  );
  const rows = await suggestions.findSuggestions(known.namesLower, maxLevel);
  return { value: aggregateSuggestions(rows) };
}

export async function getSessionSuggestions(input: SessionRequest): Promise<SessionResult> {
  if ('error' in input) return input;
  const session = await suggestions.findSession(input.value);
  if (!session) return { error: 'session_not_found' };
  const course = await suggestions.findCourse(session.dance_course_id);
  if (!course) return { error: 'course_not_found' };

  const [learned, prior] = await Promise.all([
    suggestions.findLearnedChoreographies(course.dance_group_id, currentSuggestionDate(Date.now())),
    suggestions.findPriorSessionChoreographies(course.dance_group_id, session.session_date),
  ]);
  const choreographyIds = uniqueIds(
    learned.map((row) => row.choreography_id),
    prior.map((row) => row.choreography_id),
  );
  const [group, known] = await Promise.all([
    suggestions.findGroup(course.dance_group_id),
    getKnownFigures(course.dance_group_id, choreographyIds),
  ]);
  const max_level_value = group?.max_group_level_value ?? null;
  const rows = await suggestions.findSuggestions(known.namesLower, max_level_value);
  return {
    value: {
      suggestions: aggregateSuggestions(rows),
      known_step_figures: known.names,
      max_level_value,
    },
  };
}
