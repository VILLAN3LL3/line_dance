import { readFileSync } from 'node:fs';
import path from 'node:path';
import { serverRoot } from '../utils/server-paths.ts';
import type { CoursePdf } from '../features/courses/pdf-operations.ts';
import type { CoursePdfColors } from './course-pdf-shared.ts';

export function loadOptionalAssetBuffer(assetName: string): Buffer | null {
  try {
    return readFileSync(path.join(serverRoot, 'assets', assetName));
  } catch {
    return null;
  }
}

const trainerPhoneIcon = loadOptionalAssetBuffer('icons8-mobile-phone-90.png');
const trainerEmailIcon = loadOptionalAssetBuffer('icons8-email-90.png');

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

/** Draws the trainer contact box at `doc.y` and leaves `doc.y` below it. */
export function renderTrainerBox(
  doc: PDFKit.PDFDocument,
  course: Pick<CoursePdf, 'trainer_id' | 'trainer_name' | 'trainer_phone' | 'trainer_email'>,
  trainerQr: Buffer | null,
  colors: CoursePdfColors,
): void {
  const leftMargin = doc.page.margins.left;
  const contentWidth = doc.page.width - leftMargin - doc.page.margins.right;
  const trainerBoxY = doc.y;
  const trainerBoxHeight = 112;
  const trainerQrSize = 72;
  const trainerQrX = leftMargin + contentWidth - trainerQrSize - 12;
  const trainerQrY = trainerBoxY + 20;

  doc
    .roundedRect(leftMargin, trainerBoxY, contentWidth, trainerBoxHeight, 8)
    .fillAndStroke(colors.surfaceBg, colors.surfaceBorder);

  if (course.trainer_id && trainerQr) {
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
}
