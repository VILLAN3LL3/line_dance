import QRCode from 'qrcode';
import { getCoursePdfFileName, getTrainerVCard } from './pdf-operations.ts';
import type { CoursePdf, CoursePdfId } from './pdf-operations.ts';
import { findCourseForPdf } from './pdf-repository.ts';
import { computeLearnedSteps, groupDancesBySession } from './participant-pdf-operations.ts';
import type { ParticipantPdfDanceInfo, SessionWithDances } from './participant-pdf-operations.ts';
import * as repository from './participant-pdf-repository.ts';
import { getKnownFigures } from '../suggestions/flow.ts';
import { findPriorSessionChoreographies } from '../suggestions/repository.ts';

export type ParticipantPdfLink = { url: string; qr: Buffer };
export type ParticipantPdfDance = ParticipantPdfDanceInfo & {
  stepSheet: ParticipantPdfLink | null;
  demoVideo: ParticipantPdfLink | null;
};
export type ParticipantPdfDocument = {
  course: CoursePdf;
  sessions: SessionWithDances<ParticipantPdfDance>[];
  learnedSteps: string[];
  trainerQr: Buffer | null;
  fileName: string;
};

const qrOptions = { errorCorrectionLevel: 'M', margin: 1, width: 220 } as const;

async function toLink(url: string | null): Promise<ParticipantPdfLink | null> {
  if (!url) return null;
  return { url, qr: await QRCode.toBuffer(url, qrOptions) };
}

async function loadDances(ids: number[]): Promise<Map<number, ParticipantPdfDance>> {
  const [records, authorRows] = await Promise.all([
    repository.listDancesForPdf(ids),
    repository.listAuthorsForPdf(ids),
  ]);
  const dances = await Promise.all(
    records.map(async (record): Promise<ParticipantPdfDance> => ({
      ...record,
      authors: authorRows.filter((row) => row.choreography_id === record.id).map((row) => row.name),
      stepSheet: await toLink(record.step_sheet_link),
      demoVideo: await toLink(record.demo_video_url),
    })),
  );
  return new Map(dances.map((dance) => [dance.id, dance]));
}

/** Steps the group had not seen before this course: base figures and earlier dances are excluded. */
async function findLearnedSteps(
  course: CoursePdf,
  firstSessionDate: string | undefined,
  danceIds: number[],
): Promise<string[]> {
  if (danceIds.length === 0) return [];
  const prior = firstSessionDate
    ? await findPriorSessionChoreographies(course.dance_group_id, firstSessionDate)
    : [];
  const [known, figures] = await Promise.all([
    getKnownFigures(
      course.dance_group_id,
      prior.map((row) => row.choreography_id),
    ),
    repository.listFigureNamesForPdf(danceIds),
  ]);
  return computeLearnedSteps(
    figures.map((figure) => figure.name),
    known.namesLower,
  );
}

export async function prepareParticipantPdf(
  id: CoursePdfId,
): Promise<{ error: 'course_not_found' } | { value: ParticipantPdfDocument }> {
  const course = await findCourseForPdf(id);
  if (!course) return { error: 'course_not_found' };

  const [sessions, assignments] = await Promise.all([
    repository.listSessionsWithIdForPdf(course.id),
    repository.listNewAssignmentsForPdf(course.id),
  ]);
  const danceIds = [...new Set(assignments.map((assignment) => assignment.choreography_id))];
  const [dancesById, learnedSteps] = await Promise.all([
    loadDances(danceIds),
    findLearnedSteps(course, sessions[0]?.session_date, danceIds),
  ]);
  const vCard = getTrainerVCard(course);
  return {
    value: {
      course,
      sessions: groupDancesBySession(sessions, assignments, dancesById),
      learnedSteps,
      trainerQr: vCard
        ? await QRCode.toBuffer(vCard, { errorCorrectionLevel: 'M', margin: 1, width: 180 })
        : null,
      fileName: getCoursePdfFileName(course, 'Kursabschluss'),
    },
  };
}
