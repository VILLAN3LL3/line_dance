import type { JsonValue } from '../../utils/json-input.ts';
import { informationEntry } from './validation.ts';
import type { ChoreographyWriteInput } from './validation.ts';

export type Information = { category: string; description: string };

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
  creation_year: JsonValue;
  song: JsonValue;
  artist: JsonValue;
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
    song,
    artist,
    authors,
    tags,
    step_figures,
  } = input;
  return {
    name,
    step_sheet_link: step_sheet_link || null,
    demo_video_url: demo_video_url || null,
    tutorial_video_url: tutorial_video_url || null,
    count: count || null,
    wall_count: wall_count || null,
    level,
    creation_year: creation_year || null,
    song: song || null,
    artist: artist || null,
    authors,
    tags,
    step_figures,
    information: normalizeChoreographyInformation(input.choreography_information),
  };
}
