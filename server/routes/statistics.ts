import type { Request, Response } from 'express';
import type { RepertoireStatistics } from '../contracts/api.ts';
import * as statistics from '../features/statistics/flow.ts';
import { captureError } from '../utils/choreographyRouteErrors.ts';

export async function getRepertoireStatistics(
  _req: Request,
  res: Response<RepertoireStatistics | { error: string }>,
): Promise<void> {
  try {
    res.json(await statistics.getRepertoireStatistics());
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to load the repertoire statistics' });
  }
}
