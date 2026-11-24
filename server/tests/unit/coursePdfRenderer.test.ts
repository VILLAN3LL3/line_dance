import { PassThrough } from 'node:stream';
import QRCode from 'qrcode';
import SVGtoPDF from 'svg-to-pdfkit';
import { describe, expect, it, vi } from 'vitest';
import { renderCoursePdf } from '../../routes/course-pdf-renderer.ts';
import type { CoursePdfDocument } from '../../features/courses/pdf-flow.ts';

vi.mock('svg-to-pdfkit', async (importOriginal) => {
  const original = await importOriginal<{ default: typeof SVGtoPDF }>();
  return { default: vi.fn(original.default) };
});

function document(): CoursePdfDocument {
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
    linksWithQr: [],
    trainerQr: null,
    fileName: 'course.pdf',
  };
}

describe('course PDF renderer', () => {
  it('renders the SVG placeholder and finishes a PDF for an odd number of links', async () => {
    const data = document();
    data.linksWithQr = [
      {
        label: 'Playlist',
        url: 'https://example.com',
        qr: await QRCode.toBuffer('https://example.com'),
      },
    ];
    const output = new PassThrough();
    const chunks: Buffer[] = [];
    output.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve, reject) => {
      output.on('end', resolve);
      output.on('error', reject);
    });

    vi.mocked(SVGtoPDF).mockClear();
    renderCoursePdf(output, data);
    await finished;
    expect(vi.mocked(SVGtoPDF)).toHaveBeenCalledTimes(2);
    const pdf = Buffer.concat(chunks);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('%%EOF');
  });

  it('rejects a trainer without its QR code', () => {
    const data = document();
    data.course.trainer_id = 1;
    const output = new PassThrough();
    try {
      expect(() => renderCoursePdf(output, data)).toThrow('Trainer QR code is missing');
      expect(output.readableLength).toBe(0);
    } finally {
      output.destroy();
    }
  });
});
