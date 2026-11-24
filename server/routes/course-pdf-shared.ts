import { hslToHex } from '../utils/colorUtils.ts';
import type { CoursePdf } from '../features/courses/pdf-operations.ts';

export type CoursePdfColors = {
  headerBg: string;
  headerBorder: string;
  title: string;
  subtitle: string;
  muted: string;
  surfaceBg: string;
  surfaceBorder: string;
  qrBorder: string;
  strongBorder: string;
  cardBg: string;
  cardBorder: string;
};

export const privacyDisclaimerText =
  'Datenschutzhinweis: Dieses Dokument enthält Links und QR-Codes zu externen Angeboten Dritter ' +
  '(z. B. YouTube/Google, Spotify, Copperknob). Auf deren Inhalte und Datenverarbeitung habe ich ' +
  'keinen Einfluss. Beim Aufrufen können personenbezogene Daten (insbesondere deine IP-Adresse) an die ' +
  'jeweiligen Anbieter – auch in Drittländer wie die USA – übertragen werden. Es gelten ausschließlich ' +
  'die Datenschutzbestimmungen der jeweiligen Anbieter. Die Nutzung ist freiwillig und erfolgt auf ' +
  'eigene Verantwortung.';

export function getCoursePdfColors(courseId: number): CoursePdfColors {
  const hue = (courseId * 137.508) % 360;
  return {
    headerBg: hslToHex(hue, 75, 95),
    headerBorder: hslToHex(hue, 55, 83),
    title: hslToHex(hue, 72, 25),
    subtitle: '#1F2937',
    muted: '#6B7280',
    // Neutral grays with a subtle hint of the primary hue mixed in
    surfaceBg: hslToHex(hue, 20, 98),
    surfaceBorder: hslToHex(hue, 18, 91),
    qrBorder: hslToHex(hue, 14, 91),
    strongBorder: hslToHex(hue, 16, 84),
    cardBg: hslToHex(hue, 18, 98),
    cardBorder: hslToHex(hue, 14, 85),
  };
}

function buildBalancedTwoLineTitle(
  doc: PDFKit.PDFDocument,
  rawTitle: string,
  maxWidth: number,
): string {
  const title = String(rawTitle ?? '').trim();
  const words = title.split(/\s+/).filter(Boolean);

  if (words.length < 4) {
    return title;
  }

  const singleLineWidth = doc.widthOfString(title);
  if (singleLineWidth <= maxWidth) {
    return title;
  }

  let bestSplit = null;

  for (let splitIndex = 2; splitIndex <= words.length - 2; splitIndex += 1) {
    const line1 = words.slice(0, splitIndex).join(' ');
    const line2 = words.slice(splitIndex).join(' ');
    const width1 = doc.widthOfString(line1);
    const width2 = doc.widthOfString(line2);
    const overflow = Math.max(0, width1 - maxWidth) + Math.max(0, width2 - maxWidth);
    const balancePenalty = Math.abs(width1 - width2);
    const score = overflow * 100 + balancePenalty;

    if (!bestSplit || score < bestSplit.score) {
      bestSplit = { line1, line2, score };
    }
  }

  if (!bestSplit) {
    return title;
  }

  return `${bestSplit.line1}\n${bestSplit.line2}`;
}

export function getCoursePdfSubtitle(
  course: Pick<CoursePdf, 'name' | 'course_id' | 'semester'>,
): string {
  return [
    course.name,
    course.course_id !== null ? `Kurs #${course.course_id}` : null,
    course.semester,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Draws the group/course header panel and leaves `doc.y` below it. */
export function renderCoursePdfHeader(
  doc: PDFKit.PDFDocument,
  course: Pick<CoursePdf, 'dance_group_name' | 'name' | 'course_id' | 'semester'>,
  colors: CoursePdfColors,
): void {
  const leftMargin = doc.page.margins.left;
  const contentWidth = doc.page.width - leftMargin - doc.page.margins.right;
  const headerY = doc.y;
  const headerHeight = 108;
  doc
    .roundedRect(leftMargin, headerY, contentWidth, headerHeight, 10)
    .fillAndStroke(colors.headerBg, colors.headerBorder);

  const titleY = headerY + 16;
  const titleOptions = {
    width: contentWidth,
    align: 'center' as const,
  };
  doc.fontSize(24);
  const titleText = buildBalancedTwoLineTitle(
    doc,
    `${course.dance_group_name ?? 'Dance Group'}`,
    contentWidth,
  );
  const titleHeight = doc.heightOfString(titleText, titleOptions);

  doc.fillColor(colors.title).fontSize(24).text(titleText, leftMargin, titleY, titleOptions);

  doc
    .fillColor(colors.subtitle)
    .fontSize(14)
    .text(getCoursePdfSubtitle(course), leftMargin, titleY + titleHeight + 6, {
      width: contentWidth,
      align: 'center',
    });

  doc.fillColor('black');
  doc.y = headerY + headerHeight + 18;
}
