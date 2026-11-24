import type { JsonValue } from '../../utils/json-input.ts';
import { normalizeSongs } from './song-operations.ts';
import type { SongChanges } from './song-operations.ts';
import { normalizeLearningStatusChange } from '../learning-status/operations.ts';
import type { LearningStatusChange } from '../learning-status/operations.ts';
import { informationEntry } from './validation.ts';
import type { ChoreographyWriteInput } from './validation.ts';

export type Information = { category: string; description: string };
/** `undefined` keeps the stored personal level, `null` removes it, a name sets it. */
export type PersonalLevelChange = string | null | undefined;

export function normalizePersonalLevel(value: JsonValue | undefined): PersonalLevelChange {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() || null;
  return value === null ? null : JSON.stringify(value);
}

export function normalizeChoreographyInformation(
  value: JsonValue | undefined,
): Information[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const normalized: Information[] = [];
  for (const item of value) {
    const parsed = informationEntry.safeParse(item);
    if (!parsed.success) return null;
    const category = parsed.data.category.trim();
    const description = parsed.data.description.trim();
    if (category && description) normalized.push({ category, description });
  }
  return normalized;
}

export function prepareChoreography(input: ChoreographyWriteInput): {
  name: JsonValue | undefined;
  step_sheet_link: JsonValue;
  demo_video_url: JsonValue;
  tutorial_video_url: JsonValue;
  count: JsonValue;
  wall_count: JsonValue;
  level: JsonValue | undefined;
  personal_level: PersonalLevelChange;
  learning_status: LearningStatusChange;
  creation_year: JsonValue;
  songs: SongChanges;
  authors: JsonValue | undefined;
  tags: JsonValue | undefined;
  step_figures: JsonValue | undefined;
  information: Information[] | null | undefined;
} {
  const {
    name,
    step_sheet_link,
    demo_video_url,
    tutorial_video_url,
    count,
    wall_count,
    level,
    creation_year,
    authors,
    tags,
    step_figures,
  } = input;
  return {
    name,
    step_sheet_link: step_sheet_link || null,
    demo_video_url: demo_video_url || null,
    tutorial_video_url: tutorial_video_url || null,
    count: count === '' ? null : (count ?? null),
    wall_count: wall_count === '' ? null : (wall_count ?? null),
    level,
    personal_level: normalizePersonalLevel(input.personal_level),
    learning_status: normalizeLearningStatusChange(input.learning_status),
    creation_year: creation_year === '' ? null : (creation_year ?? null),
    songs: normalizeSongs(input.choreography_songs),
    authors,
    tags,
    step_figures,
    information: normalizeChoreographyInformation(input.choreography_information),
  };
}
