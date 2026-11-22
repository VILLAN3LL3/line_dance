import { z } from 'zod';
import type { ChoreographyIssue } from '../../contracts/api.ts';
import { jsonInput } from '../../utils/json-input.ts';

const value = jsonInput.optional();
const writeInput = z
  .object({
    name: value,
    level: value,
    personal_level: value,
    step_sheet_link: value,
    demo_video_url: value,
    tutorial_video_url: value,
    count: value,
    wall_count: value,
    creation_year: value,
    song: value,
    artist: value,
    authors: value,
    tags: value,
    step_figures: value,
    choreography_information: value,
  })
  .brand<'ChoreographyWriteInput'>();
export const informationEntry = z.object({ category: z.string(), description: z.string() });

export type ChoreographyWriteInput = z.output<typeof writeInput>;
export type { ChoreographyIssue } from '../../contracts/api.ts';
export type WriteRequest<T extends boolean = boolean> = {
  input: ChoreographyWriteInput;
  issues: ChoreographyIssue[];
  partial: T;
};
export type PreparedWriteRequest = WriteRequest<true> | { exception: TypeError | RangeError };

function getChoreographyLinkIssues(data: ChoreographyWriteInput): ChoreographyIssue[] {
  const issues: ChoreographyIssue[] = [];
  for (const field of ['step_sheet_link', 'demo_video_url', 'tutorial_video_url'] as const) {
    const value = data[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') {
      issues.push({ field, key: 'invalid_url' });
      continue;
    }
    if (!value.trim()) continue;
    try {
      new URL(value.trim());
    } catch {
      issues.push({ field, key: 'invalid_url' });
    }
  }
  return issues;
}

function getChoreographyInformationIssues(data: ChoreographyWriteInput): ChoreographyIssue[] {
  const issues: ChoreographyIssue[] = [];
  if (data.choreography_information !== undefined) {
    if (!Array.isArray(data.choreography_information)) {
      issues.push({ field: 'choreography_information', key: 'invalid_information' });
    } else {
      data.choreography_information.forEach((item, index) => {
        const parsed = informationEntry.safeParse(item);
        if (!parsed.success) {
          issues.push({ field: `choreography_information.${index}`, key: 'invalid_information' });
          return;
        }
        if (!parsed.data.category.trim() && parsed.data.description.trim()) {
          issues.push({ field: `choreography_information.${index}.category`, key: 'required' });
        }
        if (parsed.data.category.trim() && !parsed.data.description.trim()) {
          issues.push({ field: `choreography_information.${index}.description`, key: 'required' });
        }
      });
    }
  }
  return issues;
}

export function getChoreographyFieldIssues(
  data: ChoreographyWriteInput,
  { partial = false }: { partial?: boolean } = {},
): ChoreographyIssue[] {
  const issues = [...getChoreographyLinkIssues(data), ...getChoreographyInformationIssues(data)];
  for (const field of ['name', 'level'] as const) {
    if (partial && data[field] === undefined) continue;
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      issues.push({ field, key: 'required' });
    }
  }
  for (const field of ['count', 'wall_count', 'creation_year'] as const) {
    const value = data[field];
    if (value !== undefined && value !== null && value !== '' && !Number.isSafeInteger(value)) {
      issues.push({ field, key: 'invalid_integer' });
    }
  }
  return issues;
}

function prepareRequest<T extends boolean>(input: unknown, partial: T): WriteRequest<T> {
  if (input === null || input === undefined) throw new TypeError('Choreography input is missing');
  const data = writeInput.parse(typeof input === 'object' && !Array.isArray(input) ? input : {});
  return { input: data, issues: getChoreographyFieldIssues(data, { partial }), partial };
}

export function prepareWriteRequest(input: unknown): WriteRequest<false> {
  return prepareRequest(input, false);
}

export function preparePartialWriteRequest(input: unknown): WriteRequest<true> {
  return prepareRequest(input, true);
}
