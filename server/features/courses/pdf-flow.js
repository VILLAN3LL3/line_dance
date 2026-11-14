import QRCode from 'qrcode';
import { getCoursePdfFileName, getCoursePdfLinks, getTrainerVCard } from './pdf-operations.js';
import { findCourseForPdf, listSessionsForPdf } from './pdf-repository.js';

export async function prepareCoursePdf(id) {
  const course = await findCourseForPdf(id);
  if (!course) return { error: 'course_not_found' };

  const sessions = await listSessionsForPdf(id);
  const linksWithQr = await Promise.all(
    getCoursePdfLinks(course).map(async (entry) => ({
      ...entry,
      qr: await QRCode.toBuffer(entry.url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220,
      }),
    })),
  );
  const vCard = getTrainerVCard(course);
  const trainerQr = vCard
    ? await QRCode.toBuffer(vCard, { errorCorrectionLevel: 'M', margin: 1, width: 180 })
    : null;
  return {
    value: { course, sessions, linksWithQr, trainerQr, fileName: getCoursePdfFileName(course) },
  };
}
