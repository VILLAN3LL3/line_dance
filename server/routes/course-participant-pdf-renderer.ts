import type { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';
import type {
  ParticipantPdfDance,
  ParticipantPdfDocument,
  ParticipantPdfLink,
} from '../features/courses/participant-pdf-flow.ts';
import {
  formatCountWall,
  formatSessionDate,
  getTrainerSignature,
} from '../features/courses/participant-pdf-operations.ts';
import {
  getCoursePdfColors,
  privacyDisclaimerText,
  renderCoursePdfHeader,
} from './course-pdf-shared.ts';
import type { CoursePdfColors } from './course-pdf-shared.ts';

const qrSize = 46;
const qrCaptionHeight = 11;
const qrSlotWidth = 64;
const cardPadding = 8;
const cardGap = 6;
const sessionHeadingHeight = 22;
const stepColumns = 3;
const stepRowHeight = 16;
const closingText = 'Ich hoffe, der Kurs hat dir gefallen!';
const trainerQrSize = 64;
const closingThanksText = 'Danke fürs Mittanzen und bis zum nächsten Mal.';

type Layout = {
  doc: PDFKit.PDFDocument;
  colors: CoursePdfColors;
  left: number;
  width: number;
  bottom: number;
  disclaimerHeight: number;
};

function ensureSpace(layout: Layout, height: number): void {
  if (layout.doc.y + height <= layout.bottom - layout.disclaimerHeight - cardGap) return;
  layout.doc.addPage();
  layout.doc.y = layout.doc.page.margins.top;
}

function danceDetails(dance: ParticipantPdfDance): string {
  return [
    dance.level,
    formatCountWall(dance.count, dance.wall_count),
    dance.authors.length > 0 ? `Choreograf: ${dance.authors.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('  |  ');
}

function measureDance(layout: Layout, dance: ParticipantPdfDance, textWidth: number): number {
  const { doc } = layout;
  doc.font('Helvetica-Bold').fontSize(12);
  let height = doc.heightOfString(dance.name, { width: textWidth });
  doc.font('Helvetica').fontSize(10);
  const details = danceDetails(dance);
  if (details) height += 3 + doc.heightOfString(details, { width: textWidth });
  return Math.max(height, qrSize + qrCaptionHeight) + 2 * cardPadding;
}

function renderLinkQr(
  layout: Layout,
  link: ParticipantPdfLink,
  caption: string,
  slotX: number,
  qrY: number,
): void {
  const { doc, colors } = layout;
  const qrX = slotX + (qrSlotWidth - qrSize) / 2;
  doc.image(link.qr, qrX, qrY, { fit: [qrSize, qrSize] });
  doc
    .roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 5)
    .lineWidth(1)
    .stroke(colors.qrBorder);
  doc.link(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, link.url);
  doc
    .font('Helvetica')
    .fillColor(colors.muted)
    .fontSize(8)
    .text(caption, slotX, qrY + qrSize + 3, {
      width: qrSlotWidth,
      align: 'center',
      lineBreak: false,
      link: link.url,
      underline: true,
    });
}

function renderDance(layout: Layout, dance: ParticipantPdfDance): void {
  const { doc, colors, left, width } = layout;
  const textWidth = width - 3 * cardPadding - 2 * qrSlotWidth;
  const height = measureDance(layout, dance, textWidth);
  ensureSpace(layout, height + cardGap);

  const top = doc.y;
  doc.roundedRect(left, top, width, height, 8).fillAndStroke(colors.cardBg, colors.cardBorder);

  doc.fillColor(colors.subtitle).font('Helvetica-Bold').fontSize(12);
  doc.text(dance.name, left + cardPadding, top + cardPadding, { width: textWidth });
  const details = danceDetails(dance);
  if (details) {
    doc.font('Helvetica').fontSize(10).fillColor(colors.muted);
    doc.text(details, left + cardPadding, doc.y + 3, { width: textWidth });
  }

  const slotsX = left + width - cardPadding - 2 * qrSlotWidth;
  const qrY = top + (height - qrSize - qrCaptionHeight) / 2;
  if (dance.stepSheet) renderLinkQr(layout, dance.stepSheet, 'Copperknob', slotsX, qrY);
  if (dance.demoVideo) {
    renderLinkQr(layout, dance.demoVideo, 'Demo-Video', slotsX + qrSlotWidth, qrY);
  }
  doc.y = top + height + cardGap;
}

function renderBoxText(layout: Layout, text: string, bold = false): void {
  const { doc, colors, left, width } = layout;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
  doc.fillColor(colors.subtitle).text(text, left + 12, doc.y, { width: width - 24 });
}

function renderHeadingBox(layout: Layout, text: string): void {
  const { doc, colors, left, width } = layout;
  const y = doc.y;
  doc
    .roundedRect(left, y, width, sessionHeadingHeight, 8)
    .fillAndStroke(colors.surfaceBg, colors.surfaceBorder);
  doc.y = y + 5.5;
  renderBoxText(layout, text, true);
  doc.y = y + sessionHeadingHeight + cardGap;
}

function renderSessions(layout: Layout, sessions: ParticipantPdfDocument['sessions']): void {
  const { doc, colors, left, width } = layout;
  if (sessions.length === 0) {
    renderHeadingBox(layout, 'Keine Termine hinterlegt.');
    return;
  }
  for (const session of sessions) {
    ensureSpace(layout, sessionHeadingHeight + cardGap + 72);
    renderHeadingBox(layout, formatSessionDate(session.session_date));
    if (session.dances.length === 0) {
      doc.font('Helvetica').fontSize(11).fillColor(colors.muted);
      doc.text('Keine neuen Tänze', left + 12, doc.y, { width: width - 24 });
      doc.y += cardGap;
    }
    session.dances.forEach((dance) => renderDance(layout, dance));
    doc.y += 2;
  }
}

function closingHeight(hasTrainerQr: boolean): number {
  return 80 + (hasTrainerQr ? trainerQrSize + 24 : 0);
}

function renderLearnedSteps(layout: Layout, steps: string[], reserved: number): void {
  const { doc, colors, left, width } = layout;
  const rows = Math.max(1, Math.ceil(steps.length / stepColumns));
  // Keep the whole block together with the closing sentence instead of orphaning it
  ensureSpace(layout, sessionHeadingHeight + 2 * cardGap + rows * stepRowHeight + reserved);
  renderHeadingBox(layout, 'Gelernte Steps in diesem Kurs');
  if (steps.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor(colors.muted);
    doc.text('In diesem Kurs wurden keine neuen Steps gelernt.', left + 12, doc.y, {
      width: width - 24,
    });
    doc.y += cardGap;
    return;
  }
  const columnWidth = (width - 24) / stepColumns;
  for (let start = 0; start < steps.length; start += stepColumns) {
    ensureSpace(layout, stepRowHeight);
    const y = doc.y;
    steps.slice(start, start + stepColumns).forEach((step, column) => {
      doc.font('Helvetica').fontSize(11).fillColor(colors.subtitle);
      doc.text(`• ${step}`, left + 12 + column * columnWidth, y, {
        width: columnWidth - 6,
        lineBreak: false,
        ellipsis: true,
      });
    });
    doc.y = y + stepRowHeight;
  }
  doc.y += cardGap;
}

function drawSmiley(doc: PDFKit.PDFDocument, colors: CoursePdfColors, x: number, y: number): void {
  const radius = 9;
  const cx = x + radius;
  const cy = y + radius;
  doc.lineWidth(1.2).circle(cx, cy, radius).fillAndStroke(colors.headerBg, colors.title);
  doc.fillColor(colors.title);
  doc.circle(cx - 3.2, cy - 2.5, 1.2).fill();
  doc.circle(cx + 3.2, cy - 2.5, 1.2).fill();
  doc
    .moveTo(cx - 4.5, cy + 2)
    .bezierCurveTo(cx - 3, cy + 6.5, cx + 3, cy + 6.5, cx + 4.5, cy + 2)
    .lineWidth(1.2)
    .stroke(colors.title);
}

function renderClosing(
  layout: Layout,
  trainerSignature: string | null,
  trainerQr: Buffer | null,
): void {
  const { doc, colors, left, width } = layout;
  ensureSpace(layout, closingHeight(Boolean(trainerQr)));
  const smileySize = 18;
  const smileyGap = 6;
  doc.font('Helvetica-Bold').fontSize(13);
  const textWidth = doc.widthOfString(closingText);
  const startX = left + (width - (textWidth + smileyGap + smileySize)) / 2;
  const y = doc.y + 6;
  doc.fillColor(colors.title).text(closingText, startX, y + 2, { lineBreak: false });
  drawSmiley(doc, colors, startX + textWidth + smileyGap, y - 1);
  doc.font('Helvetica').fontSize(11).fillColor(colors.subtitle);
  doc.text(closingThanksText, left, y + 26, { width, align: 'center' });
  if (trainerSignature) {
    doc.font('Helvetica-Bold').fontSize(13).fillColor(colors.title);
    doc.text(trainerSignature, left, doc.y + 8, { width, align: 'center' });
  }
  if (trainerQr) {
    const qrX = left + (width - trainerQrSize) / 2;
    const qrY = doc.y + 10;
    doc.image(trainerQr, qrX, qrY, { fit: [trainerQrSize, trainerQrSize] });
    doc
      .roundedRect(qrX - 3, qrY - 3, trainerQrSize + 6, trainerQrSize + 6, 6)
      .lineWidth(1)
      .stroke(colors.qrBorder);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text('Kontakt speichern (vCard)', left, qrY + trainerQrSize + 6, {
        width,
        align: 'center',
        lineBreak: false,
      });
  }
  doc.y += 12;
}

function renderDisclaimer(layout: Layout): void {
  const { doc, colors, left, width, bottom, disclaimerHeight } = layout;
  doc.font('Helvetica').fontSize(8).fillColor(colors.muted);
  doc.text(privacyDisclaimerText, left, bottom - disclaimerHeight, { width, align: 'center' });
}

/** Renders the end-of-course PDF for participants into `res`. */
export function renderParticipantPdf(res: Writable, document: ParticipantPdfDocument): void {
  const { course, sessions, learnedSteps, trainerQr } = document;
  if (course.trainer_id && !trainerQr) throw new Error('Trainer QR code is missing');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  const colors = getCoursePdfColors(course.id);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  doc.font('Helvetica').fontSize(8);
  const layout: Layout = {
    doc,
    colors,
    left,
    width,
    bottom: doc.page.height - doc.page.margins.bottom,
    disclaimerHeight: doc.heightOfString(privacyDisclaimerText, { width }),
  };

  renderCoursePdfHeader(doc, course, colors);
  renderSessions(layout, sessions);
  renderLearnedSteps(layout, learnedSteps, closingHeight(Boolean(trainerQr)));
  renderClosing(layout, getTrainerSignature(course.trainer_name, course.trainer_gender), trainerQr);
  renderDisclaimer(layout);
  doc.end();
}
