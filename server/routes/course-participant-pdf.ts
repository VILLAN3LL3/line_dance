import type { Request, Response } from 'express';
import { prepareParticipantPdf } from '../features/courses/participant-pdf-flow.ts';
import type { CoursePdfId } from '../features/courses/pdf-operations.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.ts';
import { renderParticipantPdf } from './course-participant-pdf-renderer.ts';

export async function exportParticipantPdf(
  _req: Request,
  res: Response<{ error: string }, { input: PreparedInput<CoursePdfId> }>,
): Promise<Response<{ error: string }> | void> {
  try {
    const id = res.locals.input;
    if (typeof id !== 'string') throw id.exception;
    const result = await prepareParticipantPdf(id);
    if ('error' in result) {
      return res.status(404).json({ error: 'Dance course not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.value.fileName}"`);
    renderParticipantPdf(res, result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
}
