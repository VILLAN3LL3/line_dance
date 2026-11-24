import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { serverRoot } from '../utils/server-paths.ts';
import type { CoursePdfDocument } from '../features/courses/pdf-flow.ts';
import {
  getCoursePdfColors,
  privacyDisclaimerText,
  renderCoursePdfHeader,
} from './course-pdf-shared.ts';
import { renderTrainerBox } from './course-pdf-trainer.ts';

type PlaceholderLayout = {
  linksWithQr: CoursePdfDocument['linksWithQr'];
  columns: number;
  leftMargin: number;
  cardWidth: number;
  columnGap: number;
  gridStartY: number;
  rowHeight: number;
  cardHeight?: number;
};
type PlaceholderColors = { headerBg: string; title: string };

function loadOptionalAssetText(assetName: string): string | null {
  try {
    return readFileSync(path.join(serverRoot, 'assets', assetName), 'utf8');
  } catch {
    return null;
  }
}

const dancingIconSvg = loadOptionalAssetText('dancing.svg');

function renderDancingPlaceholder(
  doc: PDFKit.PDFDocument,
  layout: PlaceholderLayout,
  colors: PlaceholderColors,
): void {
  const {
    linksWithQr,
    columns,
    leftMargin,
    cardWidth,
    columnGap,
    gridStartY,
    rowHeight,
    cardHeight,
  } = layout;

  if (!dancingIconSvg || linksWithQr.length % columns === 0) {
    return;
  }

  const emptySlotIndex = linksWithQr.length;
  const emptyColumnIndex = emptySlotIndex % columns;
  const emptyRowIndex = Math.floor(emptySlotIndex / columns);
  const emptySlotX = leftMargin + emptyColumnIndex * (cardWidth + columnGap);
  const emptySlotY = gridStartY + emptyRowIndex * rowHeight;
  const dancingIconSize = Math.min(207.36, cardWidth, cardHeight ?? 207.36);
  const dancingIconX = emptySlotX + (cardWidth - dancingIconSize);
  const dancingIconY = emptySlotY + (rowHeight - dancingIconSize) / 2;

  const dancingIconBackgroundSvg = dancingIconSvg.replace(
    'fill="#164E8A"',
    `fill="${colors.headerBg}"`,
  );
  if (dancingIconBackgroundSvg) {
    SVGtoPDF(doc, dancingIconBackgroundSvg, dancingIconX - 18, dancingIconY - 14, {
      width: dancingIconSize,
      height: dancingIconSize,
      preserveAspectRatio: 'xMaxYMid meet',
    });
  }

  const dancingIconColoredSvg = dancingIconSvg.replace('fill="#164E8A"', `fill="${colors.title}"`);
  SVGtoPDF(doc, dancingIconColoredSvg, dancingIconX, dancingIconY, {
    width: dancingIconSize,
    height: dancingIconSize,
    preserveAspectRatio: 'xMaxYMid meet',
  });
}

export function renderCoursePdf(
  res: Writable,
  { course, sessions, linksWithQr, trainerQr }: CoursePdfDocument,
): void {
  const hasTrainer = Boolean(course.trainer_id);
  if (hasTrainer && !trainerQr) throw new Error('Trainer QR code is missing');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  const colors = getCoursePdfColors(course.id);

  const pageWidth = doc.page.width;
  const leftMargin = doc.page.margins.left;
  const rightMargin = doc.page.margins.right;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  renderCoursePdfHeader(doc, course, colors);

  // Session dates section (5-column table)
  const weekdayAbbreviations = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const sessionEntries = sessions.map((s) => {
    const sessionDate = new Date(s.session_date);
    const weekday = weekdayAbbreviations[sessionDate.getDay()] ?? '';
    const day = String(sessionDate.getDate()).padStart(2, '0');
    const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
    const year = String(sessionDate.getFullYear());
    return `${weekday}, ${day}.${month}.${year}`;
  });
  const sessionsTextWidth = contentWidth - 24;
  const sessionsTextY = doc.y + 12;
  const sessionsBoxY = doc.y;
  const sessionsBottomPadding = 8;
  doc.fontSize(11);

  const sessionColumns = 5;
  const sessionRowHeight = 16;
  const sessionColumnWidth = sessionsTextWidth / sessionColumns;
  const sessionRowCount =
    sessionEntries.length > 0 ? Math.ceil(sessionEntries.length / sessionColumns) : 1;
  const sessionsTextHeight = sessionRowCount * sessionRowHeight;
  const sessionsBoxHeight =
    sessionsTextY - sessionsBoxY + sessionsTextHeight + sessionsBottomPadding;

  doc
    .roundedRect(leftMargin, sessionsBoxY, contentWidth, sessionsBoxHeight, 8)
    .fillAndStroke(colors.surfaceBg, colors.surfaceBorder);

  doc.fillColor(colors.subtitle).fontSize(11);
  if (sessionEntries.length > 0) {
    sessionEntries.forEach((entry, index) => {
      const columnIndex = index % sessionColumns;
      const rowIndex = Math.floor(index / sessionColumns);
      const cellX = leftMargin + 12 + columnIndex * sessionColumnWidth;
      const cellY = sessionsTextY + rowIndex * sessionRowHeight;
      doc.text(entry, cellX, cellY, {
        width: sessionColumnWidth,
        align: 'left',
        lineBreak: false,
      });
    });
  } else {
    doc.text('Keine Termine hinterlegt.', leftMargin + 12, sessionsTextY, {
      width: sessionsTextWidth,
      align: 'left',
      lineGap: 0,
    });
  }

  doc.y = sessionsBoxY + sessionsBoxHeight + 12;
  renderTrainerBox(doc, course, trainerQr, colors);

  if (linksWithQr.length === 0) {
    const warningBoxY = doc.y;
    const warningBoxHeight = 56;
    const noLinksText = 'Keine Playlist-Links für diesen Kurs hinterlegt.';
    doc.fontSize(12);
    const noLinksTextHeight = doc.heightOfString(noLinksText, {
      width: contentWidth - 24,
    });
    const noLinksTextY = warningBoxY + (warningBoxHeight - noLinksTextHeight) / 2;

    doc
      .roundedRect(leftMargin, warningBoxY, contentWidth, warningBoxHeight, 8)
      .fillAndStroke('#FFF7ED', '#FED7AA');
    doc.fillColor('#9A3412').text(noLinksText, leftMargin + 12, noLinksTextY, {
      width: contentWidth - 24,
      align: 'center',
    });
    doc.end();
    return;
  }

  const columns = 2;
  const columnGap = 16;
  const cardWidth = (contentWidth - columnGap) / columns;
  const labelHeight = 24;
  const cardPadding = 12;
  const cardBottomPad = 18;
  const rowGap = 18;
  const maxQrSize = 160;
  const gridStartY = doc.y;

  // Measure the footer disclaimer up front so the tile grid can reserve space for it
  const disclaimerText = privacyDisclaimerText;
  doc.fontSize(8);
  const disclaimerHeight = doc.heightOfString(disclaimerText, { width: contentWidth });
  const disclaimerGap = 16;
  const disclaimerY = doc.page.height - doc.page.margins.bottom - disclaimerHeight;
  const gridBottomLimit = disclaimerY - disclaimerGap;

  // Adaptively size the tiles so multiple rows always fit above the disclaimer
  const rowCount = Math.ceil(linksWithQr.length / columns);
  const availableGridHeight = gridBottomLimit - gridStartY;
  const fittedCardHeight = (availableGridHeight - (rowCount - 1) * rowGap) / rowCount;
  const qrSize = Math.max(
    80,
    Math.min(maxQrSize, fittedCardHeight - (labelHeight + cardPadding + cardBottomPad)),
  );
  const cardHeight = qrSize + labelHeight + cardPadding + cardBottomPad;
  const rowHeight = cardHeight + rowGap;

  linksWithQr.forEach((entry, index) => {
    const columnIndex = index % columns;
    const rowIndex = Math.floor(index / columns);
    const blockX = leftMargin + columnIndex * (cardWidth + columnGap);
    const blockY = gridStartY + rowIndex * rowHeight;
    const cardX = blockX;
    const cardY = blockY;
    const qrX = cardX + (cardWidth - qrSize) / 2;
    const qrY = cardY + labelHeight + cardPadding;

    doc
      .roundedRect(cardX, cardY, cardWidth, cardHeight, 10)
      .fillAndStroke(colors.cardBg, colors.cardBorder);

    doc
      .fillColor(colors.subtitle)
      .fontSize(13)
      .text(entry.label, cardX, cardY + 10, {
        width: cardWidth,
        align: 'center',
      });

    doc.image(entry.qr, qrX, qrY, { fit: [qrSize, qrSize] });

    doc
      .roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 6)
      .lineWidth(1)
      .stroke(colors.qrBorder);
  });

  renderDancingPlaceholder(
    doc,
    {
      linksWithQr,
      columns,
      leftMargin,
      cardWidth,
      columnGap,
      gridStartY,
      rowHeight,
      cardHeight,
    },
    colors,
  );

  doc.fillColor(colors.muted).fontSize(8).text(disclaimerText, leftMargin, disclaimerY, {
    width: contentWidth,
    align: 'center',
  });

  doc.end();
}
