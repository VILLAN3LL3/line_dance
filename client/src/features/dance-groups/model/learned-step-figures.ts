import type { Choreography, LearnedChoreography, SearchFilters, Session } from "../../../types";

/** Step figures the group knows: base figures plus those from choreographies learned before today. */
export const getLearnedStepFigures = (
  learnedChoreographies: LearnedChoreography[],
  choreographies: Choreography[],
  baseStepFigureNames: string[],
  berlinTodayIso: string,
): string[] => {
  const learnedFromChoreographies = learnedChoreographies
    .filter((learned) => learned.first_learned_date < berlinTodayIso)
    .flatMap(
      (learned) => choreographies.find((c) => c.id === learned.choreography_id)?.step_figures ?? [],
    );

  return Array.from(new Set([...baseStepFigureNames, ...learnedFromChoreographies])).sort((a, b) =>
    a.localeCompare(b),
  );
};

const levelFilter = (maxGroupLevelValue: number | null): SearchFilters =>
  maxGroupLevelValue === null ? {} : { max_level_value: maxGroupLevelValue };

/** Search for choreographies that use exactly the learned figures. */
export const buildLearnedSearchFilters = (
  learnedStepFigures: string[],
  maxGroupLevelValue: number | null,
): SearchFilters => ({
  step_figures: learnedStepFigures,
  step_figures_match_mode: "exact",
  ...levelFilter(maxGroupLevelValue),
});

/** Search for choreographies that teach exactly one new figure on top of the learned ones. */
export const buildSuggestionSearchFilters = (
  learnedStepFigures: string[],
  suggestedFigures: string[],
  maxGroupLevelValue: number | null,
): SearchFilters => ({
  step_figures: [...learnedStepFigures, ...suggestedFigures],
  step_figures_match_mode: "exact",
  required_step_figures: suggestedFigures,
  ...levelFilter(maxGroupLevelValue),
});

export const buildSearchPageUrl = (filters: SearchFilters): string =>
  "/?filters=" + encodeURIComponent(JSON.stringify(filters));

export const groupSessionsByCourseId = (sessions: Session[]): Record<number, Session[]> =>
  sessions.reduce<Record<number, Session[]>>((acc, session) => {
    const courseSessions = acc[session.dance_course_id] ?? [];
    courseSessions.push(session);
    acc[session.dance_course_id] = courseSessions;
    return acc;
  }, {});
