import { matchesName } from "../../../shared/utils/search";
import type {
  Choreography,
  PracticeConfidence,
  PracticeLogEntry,
  PracticeLogRequest,
} from "../../../types";

/** Entries per request; the next page is loaded when the end of the list scrolls into view. */
export const LOG_PAGE_SIZE = 50;

export const CONFIDENCE_OPTIONS: readonly {
  value: PracticeConfidence;
  label: string;
  emoji: string;
}[] = [
  { value: "sure", label: "Sure", emoji: "✅" },
  { value: "unsure", label: "Unsure", emoji: "❓" },
];

export const describeConfidence = (confidence: PracticeConfidence): string =>
  CONFIDENCE_OPTIONS.find((option) => option.value === confidence)?.label ?? confidence;

/** Local calendar day as YYYY-MM-DD, the format of the API and of `<input type="date">`. */
export function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface PracticeDraft {
  choreographyIds: number[];
  practicedOn: string;
  confidence: PracticeConfidence;
  note: string;
  songId?: number | null;
}

/** An empty date is left out so that the server uses today; a blank note is not sent. */
export function buildLogRequest(draft: PracticeDraft): PracticeLogRequest {
  const note = draft.note.trim();
  return {
    choreography_ids: draft.choreographyIds,
    ...(draft.practicedOn ? { practiced_on: draft.practicedOn } : {}),
    confidence: draft.confidence,
    ...(draft.songId != null ? { song_id: draft.songId } : {}),
    ...(note ? { note } : {}),
  };
}

export interface PracticeLogDay {
  date: string;
  entries: PracticeLogEntry[];
}

/** Groups entries by day, keeping the order of the server (newest day first). */
export function groupLogByDay(entries: readonly PracticeLogEntry[]): PracticeLogDay[] {
  return entries.reduce<PracticeLogDay[]>((days, entry) => {
    const day = days.find((candidate) => candidate.date === entry.practiced_on);
    if (day) day.entries.push(entry);
    else days.push({ date: entry.practiced_on, entries: [entry] });
    return days;
  }, []);
}

export const toggleSelection = (selected: readonly number[], id: number): number[] =>
  selected.includes(id) ? selected.filter((candidate) => candidate !== id) : [...selected, id];

export const filterByName = (dances: readonly Choreography[], query: string): Choreography[] =>
  dances.filter((dance) => matchesName(dance.name, query));
