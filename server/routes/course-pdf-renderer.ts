import { readFileSync } from 'node:fs';
import type { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { hslToHex } from '../utils/colorUtils.ts';
import type { CoursePdfDocument } from '../features/courses/pdf-flow.ts';
import type { CoursePdf } from '../features/courses/pdf-operations.ts';

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

function loadOptionalAssetBuffer(relativeAssetPath: string): Buffer | null {
  try {
    return readFileSync(new URL(relativeAssetPath, import.meta.url));
  } catch {
    return null;
  }
}

function loadOptionalAssetText(relativeAssetPath: string): string | null {
  try {
    return readFileSync(new URL(relativeAssetPath, import.meta.url), 'utf8');
  } catch {
    return null;
  }
}

const trainerPhoneIcon = loadOptionalAssetBuffer('../assets/icons8-mobile-phone-90.png');
const trainerEmailIcon = loadOptionalAssetBuffer('../assets/icons8-email-90.png');
const dancingIconSvg = loadOptionalAssetText('../assets/dancing.svg');

function courseIdToColors(courseId: number): {
  headerBg: string;
  headerBorder: string;
  title: string;
  surfaceBg: string;
  surfaceBorder: string;
  cardBg: string;
  cardBorder: string;
  qrBorder: string;
  strongBorder: string;
} {
  const hue = (courseId * 137.508) % 360;
  return {
    headerBg: hslToHex(hue, 75, 95),
    headerBorder: hslToHex(hue, 55, 83),
    title: hslToHex(hue, 72, 25),
    // Neutral grays with a subtle hint of the primary hue mixed in
    surfaceBg: hslToHex(hue, 20, 98),
    surfaceBorder: hslToHex(hue, 18, 91),
    cardBg: hslToHex(hue, 18, 98),
    cardBorder: hslToHex(hue, 14, 85),
    qrBorder: hslToHex(hue, 14, 91),
    strongBorder: hslToHex(hue, 16, 84),
  };
}

function formatPhoneNumberDin(number: string | null): string {
  const input = String(number ?? '').trim();
  if (!input) {
    return '';
  }

  const digits = input.replaceAll(/\D/g, '');
  if (!digits) {
    return input;
  }

  const { countryPrefix, nationalNumber } = parseGermanPhoneInput(input, digits);
  if (!nationalNumber) {
    return countryPrefix || input;
  }

  const areaCodeLength = getAreaCodeLength(countryPrefix, nationalNumber);
  const boundedAreaCodeLength = Math.max(1, Math.min(areaCodeLength, nationalNumber.length));
  const areaCode = nationalNumber.slice(0, boundedAreaCodeLength);
  const subscriberNumber = nationalNumber.slice(boundedAreaCodeLength);

  return formatPhoneSegments(countryPrefix, areaCode, subscriberNumber);
}

function parseGermanPhoneInput(
  input: string,
  digits: string,
): { countryPrefix: string; nationalNumber: string } {
  const hasPlusPrefix = input.startsWith('+');
  const hasInternationalZeroPrefix = input.startsWith('00');
  const isGermanInternational =
    (hasPlusPrefix && digits.startsWith('49')) ||
    (hasInternationalZeroPrefix && digits.startsWith('0049'));

  let countryPrefix = '';
  let nationalNumber = digits;

  if (isGermanInternational) {
    countryPrefix = '+49';
    nationalNumber = hasInternationalZeroPrefix ? digits.slice(4) : digits.slice(2);
    if (nationalNumber.startsWith('0')) {
      nationalNumber = nationalNumber.slice(1);
    }
  }

  return { countryPrefix, nationalNumber };
}

function getAreaCodeLength(countryPrefix: string, nationalNumber: string): number {
  const mobilePrefixLength = countryPrefix ? 3 : 4;
  const shortAreaPrefixLength = countryPrefix ? 2 : 3;
  const defaultAreaPrefixLength = countryPrefix ? 3 : 4;

  if (
    (countryPrefix && nationalNumber.startsWith('1')) ||
    (!countryPrefix && nationalNumber.startsWith('01'))
  ) {
    return mobilePrefixLength;
  }

  const shortAreaPrefixes = countryPrefix ? ['30', '40', '69', '89'] : ['030', '040', '069', '089'];
  if (shortAreaPrefixes.some((prefix) => nationalNumber.startsWith(prefix))) {
    return shortAreaPrefixLength;
  }

  return defaultAreaPrefixLength;
}

function formatPhoneSegments(
  countryPrefix: string,
  areaCode: string,
  subscriberNumber: string,
): string {
  if (!subscriberNumber) {
    return countryPrefix ? `${countryPrefix} ${areaCode}` : areaCode;
  }

  return countryPrefix
    ? `${countryPrefix} ${areaCode} ${subscriberNumber}`
    : `${areaCode} ${subscriberNumber}`;
}

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

function getCoursePdfSubtitle(course: CoursePdf): string {
  return [
    course.name,
    course.course_id !== null ? `Kurs #${course.course_id}` : null,
    course.semester,
  ]
    .filter(Boolean)
    .join(' ');
}

export function renderCoursePdf(
  res: Writable,
  { course, sessions, linksWithQr, trainerQr }: CoursePdfDocument,
): void {
  const hasTrainer = Boolean(course.trainer_id);
  if (hasTrainer && !trainerQr) throw new Error('Trainer QR code is missing');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  const dynamicColors = courseIdToColors(course.id);
  const colors = {
    headerBg: dynamicColors.headerBg,
    headerBorder: dynamicColors.headerBorder,
    title: dynamicColors.title,
    subtitle: '#1F2937',
    muted: '#6B7280',
    surfaceBg: dynamicColors.surfaceBg,
    surfaceBorder: dynamicColors.surfaceBorder,
    qrBorder: dynamicColors.qrBorder,
    strongBorder: dynamicColors.strongBorder,
    cardBg: dynamicColors.cardBg,
    cardBorder: dynamicColors.cardBorder,
  };

  const pageWidth = doc.page.width;
  const leftMargin = doc.page.margins.left;
  const rightMargin = doc.page.margins.right;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Friendly header panel
  const headerY = doc.y;
  const headerHeight = 108;
  doc
    .roundedRect(leftMargin, headerY, contentWidth, headerHeight, 10)
    .fillAndStroke(colors.headerBg, colors.headerBorder);

  const titleY = headerY + 16;
  const titleTextRaw = `${course.dance_group_name ?? 'Dance Group'}`;
  const titleOptions = {
    width: contentWidth,
    align: 'center' as const,
  };
  doc.fontSize(24);
  const titleText = buildBalancedTwoLineTitle(doc, titleTextRaw, contentWidth);
  const titleHeight = doc.heightOfString(titleText, titleOptions);

  doc.fillColor(colors.title).fontSize(24).text(titleText, leftMargin, titleY, titleOptions);

  const subtitleY = titleY + titleHeight + 6;

  doc
    .fillColor(colors.subtitle)
    .fontSize(14)
    .text(getCoursePdfSubtitle(course), leftMargin, subtitleY, {
      width: contentWidth,
      align: 'center',
    });

  doc.fillColor('black');
  doc.y = headerY + headerHeight + 18;

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

  const trainerBoxY = sessionsBoxY + sessionsBoxHeight + 12;
  const trainerBoxHeight = 112;
  const trainerQrSize = 72;
  const trainerQrX = leftMargin + contentWidth - trainerQrSize - 12;
  const trainerQrY = trainerBoxY + 20;

  doc
    .roundedRect(leftMargin, trainerBoxY, contentWidth, trainerBoxHeight, 8)
    .fillAndStroke(colors.surfaceBg, colors.surfaceBorder);

  if (hasTrainer && trainerQr) {
    doc.fillColor(colors.subtitle).fontSize(11);
    const nameText = `${course.trainer_name}`.toUpperCase();
    const phoneText = `${formatPhoneNumberDin(course.trainer_phone)}`;
    const emailText = `${course.trainer_email}`;
    const contactLineWidth = contentWidth - trainerQrSize - 34;
    const contactIconSize = 12;
    const contactIconX = leftMargin + 12;
    const contactTextX = contactIconX + contactIconSize + 5;
    const contactTextWidth = contactLineWidth - (contactTextX - (leftMargin + 12));
    const contactLineGap = 5;

    doc.font('Helvetica-Bold').fontSize(11);
    const nameHeight = doc.heightOfString(nameText, { width: contactLineWidth });
    doc.font('Helvetica').fontSize(11);
    const phoneHeight = doc.heightOfString(phoneText, { width: contactTextWidth });
    const emailHeight = doc.heightOfString(emailText, { width: contactTextWidth });

    const phoneRowHeight = Math.max(phoneHeight, contactIconSize);
    const emailRowHeight = Math.max(emailHeight, contactIconSize);
    const contactBlockHeight =
      nameHeight + contactLineGap + phoneRowHeight + contactLineGap + emailRowHeight;
    const contactBlockTop = trainerBoxY + Math.max(8, (trainerBoxHeight - contactBlockHeight) / 2);
    const nameY = contactBlockTop;
    const phoneLineY = nameY + nameHeight + contactLineGap;
    const emailLineY = phoneLineY + phoneRowHeight + contactLineGap;
    const phoneIconY = phoneLineY + (phoneHeight - contactIconSize) / 2;
    const emailIconY = emailLineY + (emailHeight - contactIconSize) / 2;

    doc.font('Helvetica-Bold').text(nameText, leftMargin + 12, nameY, {
      width: contactLineWidth,
    });

    if (trainerPhoneIcon) {
      doc.image(trainerPhoneIcon, contactIconX, phoneIconY, {
        fit: [contactIconSize, contactIconSize],
      });
    }

    if (trainerEmailIcon) {
      doc.image(trainerEmailIcon, contactIconX, emailIconY, {
        fit: [contactIconSize, contactIconSize],
      });
    }

    doc.font('Helvetica').text(phoneText, contactTextX, phoneLineY, {
      width: contactTextWidth,
    });
    doc.text(emailText, contactTextX, emailLineY, {
      width: contactTextWidth,
    });

    doc.image(trainerQr, trainerQrX, trainerQrY, { fit: [trainerQrSize, trainerQrSize] });
    doc
      .roundedRect(trainerQrX - 2, trainerQrY - 2, trainerQrSize + 4, trainerQrSize + 4, 4)
      .lineWidth(1)
      .stroke(colors.strongBorder);

    doc
      .fillColor(colors.muted)
      .fontSize(9)
      .text('vCard', trainerQrX, trainerQrY + trainerQrSize + 3, {
        width: trainerQrSize,
        align: 'center',
      });
  } else {
    const noTrainerText = 'Kein Trainer fuer diesen Kurs hinterlegt.';
    const noTrainerTextHeight = doc.heightOfString(noTrainerText, {
      width: contentWidth - 24,
    });
    const noTrainerTextY = trainerBoxY + (trainerBoxHeight - noTrainerTextHeight) / 2;
    doc
      .fillColor(colors.muted)
      .fontSize(11)
      .text(noTrainerText, leftMargin + 12, noTrainerTextY, {
        width: contentWidth - 24,
      });
  }

  doc.y = trainerBoxY + trainerBoxHeight + 14;

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
  const disclaimerText =
    'Datenschutzhinweis: Dieses Dokument enthält Links und QR-Codes zu externen Angeboten Dritter ' +
    '(z. B. YouTube/Google, Spotify, Copperknob). Auf deren Inhalte und Datenverarbeitung habe ich ' +
    'keinen Einfluss. Beim Aufrufen können personenbezogene Daten (insbesondere deine IP-Adresse) an die ' +
    'jeweiligen Anbieter – auch in Drittländer wie die USA – übertragen werden. Es gelten ausschließlich ' +
    'die Datenschutzbestimmungen der jeweiligen Anbieter. Die Nutzung ist freiwillig und erfolgt auf ' +
    'eigene Verantwortung.';
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
