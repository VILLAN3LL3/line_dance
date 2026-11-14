import type { Request, Response } from 'express';
import { prepareCoursePdf } from '../features/courses/pdf-flow.ts';
import { prepareCoursePdfId } from '../features/courses/pdf-operations.ts';
import type { CoursePdfId } from '../features/courses/pdf-operations.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';
import { renderCoursePdf } from './course-pdf-renderer.js';

export const preparePdfId = prepareInput((req) => req.params, prepareCoursePdfId);

export async function exportDanceCoursePdf(
  _req: Request,
  res: Response<{ error: string }, { input: PreparedInput<CoursePdfId> }>,
): Promise<Response<{ error: string }> | void> {
  try {
    const id = res.locals.input;
    if (typeof id !== 'string') throw id.exception;
    const result = await prepareCoursePdf(id);
    if ('error' in result) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.value.fileName}"`);
    renderCoursePdf(res, result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
}
