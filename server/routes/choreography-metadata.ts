import type { Request, Response } from 'express';
import * as metadata from '../features/metadata/flow.ts';
import { prepareLevel } from '../features/metadata/operations.ts';
import type { LevelInput } from '../features/metadata/operations.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';

type LevelError = 'name_required' | 'duplicate_level' | 'invalid_value';
type ErrorResponse = { error: string };
type Level = Awaited<ReturnType<typeof metadata.getLevels>>[number];
type AddLevel = Extract<Awaited<ReturnType<typeof metadata.addLevel>>, { value: object }>['value'];
type AuthorStatistics = Awaited<ReturnType<typeof metadata.getAuthorStats>>;

const levelErrors: Record<LevelError, [number, string]> = {
  name_required: [400, 'Level name is required'],
  duplicate_level: [400, 'This level already exists'],
  invalid_value: [400, 'Level value must be an integer'],
};

function sendLevelError<T>(
  res: Response<T | ErrorResponse>,
  error: LevelError,
): Response<T | ErrorResponse> {
  const response = levelErrors[error];
  if (!response) throw new Error(`Unknown level error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareLevelInput = prepareInput((req) => req.body, prepareLevel);

export async function getLevels(
  _req: Request,
  res: Response<Level[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getLevels());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
}

export async function getTags(
  _req: Request,
  res: Response<string[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getTags());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

export async function getChoreographyInfoCategories(
  _req: Request,
  res: Response<string[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getInformationCategories());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography information categories' });
  }
}

export async function getAuthors(
  _req: Request,
  res: Response<string[] | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getAuthors());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
}

export async function getAuthorStats(
  _req: Request,
  res: Response<AuthorStatistics | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getAuthorStats());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch author stats' });
  }
}

export async function addLevel(
  _req: Request,
  res: Response<AddLevel | ErrorResponse, { input: PreparedInput<LevelInput> }>,
): Promise<Response<AddLevel | ErrorResponse> | void> {
  try {
    const result = await metadata.addLevel(res.locals.input);
    if ('error' in result) return sendLevelError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to add level' });
  }
}

export async function getMaxChoreographyCount(
  _req: Request,
  res: Response<{ max_count: number } | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getMaxChoreographyCount());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch max choreography count' });
  }
}

export async function getCountryCodes(
  _req: Request,
  res: Response<Record<string, string> | ErrorResponse>,
): Promise<void> {
  try {
    res.json(await metadata.getCountryCodes());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch country codes' });
  }
}
