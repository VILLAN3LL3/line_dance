export type ParticipantPdfSession = { id: number; session_date: string };
export type ParticipantPdfAssignment = { session_id: number; choreography_id: number };
export type ParticipantPdfDanceRecord = {
  id: number;
  name: string;
  level: string | null;
  count: number | string | null;
  wall_count: number | string | null;
  step_sheet_link: string | null;
  demo_video_url: string | null;
};
export type ParticipantPdfDanceInfo = ParticipantPdfDanceRecord & { authors: string[] };
export type SessionWithDances<D> = { session_date: string; dances: D[] };

const weekdayAbbreviations = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** `Mi, 15.01.2025` for an ISO date; independent of the server time zone. */
export function formatSessionDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${weekdayAbbreviations[date.getUTCDay()]}, ${day}.${month}.${date.getUTCFullYear()}`;
}

/** `32 Count / 4 Wall`; parts without a value are omitted, null if neither is known. */
export function formatCountWall(
  count: number | string | null,
  wallCount: number | string | null,
): string | null {
  const parts = [
    count === null || count === '' ? null : `${count} Count`,
    wallCount === null || wallCount === '' ? null : `${wallCount} Wall`,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(' / ');
}

/** Keeps every session (also without new dances) in order and each dance in assignment order. */
export function groupDancesBySession<D extends { id: number }>(
  sessions: ParticipantPdfSession[],
  assignments: ParticipantPdfAssignment[],
  dancesById: Map<number, D>,
): SessionWithDances<D>[] {
  return sessions.map((session) => ({
    session_date: session.session_date,
    dances: assignments
      .filter((assignment) => assignment.session_id === session.id)
      .map((assignment) => dancesById.get(assignment.choreography_id))
      .filter((dance): dance is D => dance !== undefined),
  }));
}

/** `Deine Jane` / `Dein Jan`; only the name when the gender is diverse or unspecified. */
export function getTrainerSignature(
  name: string | null,
  gender: 'female' | 'male' | 'diverse' | null,
): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (gender === 'female') return `Deine ${trimmed}`;
  if (gender === 'male') return `Dein ${trimmed}`;
  return trimmed;
}

/** Figures of the new dances that the group did not know before (case-insensitive). */
export function computeLearnedSteps(figureNames: string[], knownNamesLower: string[]): string[] {
  const known = new Set(knownNamesLower);
  const unique = new Map<string, string>();
  for (const name of figureNames) {
    const key = name.toLowerCase();
    if (!known.has(key) && !unique.has(key)) unique.set(key, name);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
}
