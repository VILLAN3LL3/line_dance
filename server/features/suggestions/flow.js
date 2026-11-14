import {
  currentSuggestionDate,
  knownFigureNames,
  parseMaxLevel,
  uniqueIds,
  validatePositiveId,
} from './operations.js';
import * as suggestions from './repository.js';

async function getKnownFigures(groupId, choreographyIds) {
  const baseRows = await suggestions.findBaseFigures(groupId);
  const choreographyRows = await suggestions.findChoreographyFigures(choreographyIds);
  const seedIds = uniqueIds(
    baseRows.map((row) => row.step_figure_id),
    choreographyRows.map((row) => row.id),
  );
  return knownFigureNames(await suggestions.findExpandedFigures(seedIds));
}

export function getLearnedChoreographies(groupId) {
  return suggestions.listLearnedChoreographies(groupId);
}

export async function getGroupSuggestions(rawId, rawMaxLevel) {
  const id = validatePositiveId(rawId, 'invalid_group_id');
  if (id.error) return id;
  const maxLevel = parseMaxLevel(rawMaxLevel);
  if (!(await suggestions.findGroup(id.value))) return { error: 'group_not_found' };

  const learned = await suggestions.findLearnedChoreographies(
    id.value,
    currentSuggestionDate(Date.now()),
  );
  const known = await getKnownFigures(
    id.value,
    learned.map((row) => row.choreography_id),
  );
  return { value: await suggestions.findSuggestions(known.namesLower, maxLevel) };
}

export async function getSessionSuggestions(rawId) {
  const id = validatePositiveId(rawId, 'invalid_session_id');
  if (id.error) return id;
  const session = await suggestions.findSession(id.value);
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
  return {
    value: {
      suggestions: await suggestions.findSuggestions(known.namesLower, max_level_value),
      known_step_figures: known.names,
      max_level_value,
    },
  };
}
