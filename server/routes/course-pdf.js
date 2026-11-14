import { prepareCoursePdf } from '../features/courses/pdf-flow.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';
import { renderCoursePdf } from './course-pdf-renderer.js';

export async function exportDanceCoursePdf(req, res) {
  try {
    const result = await prepareCoursePdf(req.params.id);
    if (result.error === 'course_not_found') {
      return res.status(404).json({ error: 'Dance course not found' });
    }
    if (result.error) throw new Error(`Unknown course PDF error: ${result.error}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.value.fileName}"`);
    renderCoursePdf(res, result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
}
