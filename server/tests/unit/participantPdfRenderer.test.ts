import { PassThrough } from 'node:stream';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { renderParticipantPdf } from '../../routes/course-participant-pdf-renderer.ts';
import type {
  ParticipantPdfDance,
  ParticipantPdfDocument,
} from '../../features/courses/participant-pdf-flow.ts';

async function render(data: ParticipantPdfDocument): Promise<string> {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => {
    output.on('end', resolve);
    output.on('error', reject);
  });
  renderParticipantPdf(output, data);
  await finished;
  const pdf = Buffer.concat(chunks);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  return pdf.toString('latin1');
}

function baseDocument(): ParticipantPdfDocument {
  return {
    course: {
      id: 1,
      course_id: null,
      name: 'Course',
      semester: null,
      dance_group_id: 1,
      dance_group_name: 'Group',
      youtube_playlist_url: null,
      copperknob_list_url: null,
      spotify_playlist_url: null,
      trainer_id: null,
      trainer_name: null,
      trainer_phone: null,
      trainer_email: null,
      trainer_gender: null,
    },
    sessions: [],
    learnedSteps: [],
    trainerQr: null,
    fileName: 'x.pdf',
  };
}

async function dance(id: number, withLinks: boolean): Promise<ParticipantPdfDance> {
  const link = async (url: string): Promise<{ url: string; qr: Buffer }> => ({
    url,
    qr: await QRCode.toBuffer(url),
  });
  return {
    id,
    name: `Dance ${id}`,
    level: 'Beginner',
    count: 32,
    wall_count: 4,
    step_sheet_link: withLinks ? 'https://example.com/sheet' : null,
    demo_video_url: withLinks ? 'https://example.com/video' : null,
    authors: ['Jane Doe'],
    stepSheet: withLinks ? await link('https://example.com/sheet') : null,
    demoVideo: withLinks ? await link('https://example.com/video') : null,
  };
}

describe('participant PDF renderer', () => {
  it('renders an empty course without dances', async () => {
    expect(await render(baseDocument())).toContain('%%EOF');
  });

  it('adds clickable link annotations for both QR codes', async () => {
    const data = baseDocument();
    data.sessions = [
      { session_date: '2025-01-15', dances: [await dance(1, true), await dance(2, false)] },
    ];
    data.learnedSteps = ['Vine'];
    const pdf = await render(data);
    expect(pdf).toContain('https://example.com/sheet');
    expect(pdf).toContain('https://example.com/video');
    expect(pdf.match(/\/Subtype \/Link/g)).toHaveLength(4);
  });

  it('paginates many dances and renders the trainer box', async () => {
    const data = baseDocument();
    data.course.trainer_id = 1;
    data.course.trainer_name = 'Jane';
    data.course.trainer_phone = '0123456789';
    data.course.trainer_email = 'jane@example.com';
    data.course.trainer_gender = 'female';
    data.trainerQr = await QRCode.toBuffer('vcard');
    data.sessions = [
      {
        session_date: '2025-01-15',
        dances: await Promise.all(Array.from({ length: 12 }, (_, index) => dance(index, true))),
      },
    ];
    const pdf = await render(data);
    expect(pdf.match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
  });

  it('rejects a trainer without its QR code', () => {
    const data = baseDocument();
    data.course.trainer_id = 1;
    const output = new PassThrough();
    try {
      expect(() => renderParticipantPdf(output, data)).toThrow('Trainer QR code is missing');
    } finally {
      output.destroy();
    }
  });
});
