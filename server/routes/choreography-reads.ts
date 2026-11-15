import type { Request, Response } from 'express';
import type { Choreography, DuplicateChoreography, PaginatedResponse } from '../contracts/api.ts';
import * as reads from '../features/choreographies/read-flow.ts';
import {
  prepareChoreographyReadId,
  prepareDuplicateQuery,
  preparePagination,
  prepareSearchQuery,
} from '../features/choreographies/read-validation.ts';
import type {
  ChoreographyReadId,
  DuplicateInput,
  SearchQuery,
} from '../features/choreographies/read-validation.ts';
import type { Pagination } from '../features/choreographies/read-operations.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';

type ErrorResponse = { error: string };
type Locals<T> = { input: PreparedInput<T> };
type ChoreographyPage = PaginatedResponse<Choreography>;

export const prepareList = prepareInput((req) => req.query, preparePagination);
export const prepareDuplicates = prepareInput((req) => req.query, prepareDuplicateQuery);
export const prepareSearch = prepareInput((req) => req.query, prepareSearchQuery);
export const prepareReadId = prepareInput((req) => req.params, prepareChoreographyReadId);

export async function getChoreographies(
  _req: Request,
  res: Response<ChoreographyPage | ErrorResponse, Locals<Pagination>>,
): Promise<void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    res.json(await reads.listChoreographies(input));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreographies' });
  }
}

export async function checkDuplicateChoreographies(
  _req: Request,
  res: Response<DuplicateChoreography[] | ErrorResponse, Locals<DuplicateInput>>,
): Promise<Response<DuplicateChoreography[] | ErrorResponse>> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    return res.json(await reads.checkDuplicates(input));
  } catch (error) {
    captureError(error);
    return res.status(500).json({ error: 'Failed to check duplicates' });
  }
}

export async function getChoreographyById(
  _req: Request,
  res: Response<Choreography | ErrorResponse, Locals<{ value: ChoreographyReadId }>>,
): Promise<Response<Choreography | ErrorResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await reads.getChoreography(input.value);
    if ('error' in result) return res.status(404).json({ error: 'Choreography not found' });
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch choreography' });
  }
}

export async function searchChoreographies(
  _req: Request,
  res: Response<ChoreographyPage | ErrorResponse, Locals<SearchQuery>>,
): Promise<void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    res.json(await reads.searchChoreographies(input));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to search choreographies' });
  }
}
