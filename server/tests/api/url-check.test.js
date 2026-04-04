import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { checkUrl } from '../../routes/url-check.js';

// ---------------------------------------------------------------------------
// Minimal test app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.get('/api/url-check', checkUrl);

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('GET /api/url-check — input validation', () => {
  it('returns 400 when url param is missing', async () => {
    const res = await request(app).get('/api/url-check');
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-http(s) URL', async () => {
    const res = await request(app).get('/api/url-check').query({ url: 'ftp://example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a private/loopback URL (SSRF guard)', async () => {
    const res = await request(app).get('/api/url-check').query({ url: 'http://localhost/secret' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// HEAD succeeds
// ---------------------------------------------------------------------------

describe('GET /api/url-check — HEAD succeeds', () => {
  it('returns ok:true when HEAD returns 200', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await request(app).get('/api/url-check').query({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: 200 });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('returns ok:false when HEAD returns 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const res = await request(app)
      .get('/api/url-check')
      .query({ url: 'https://example.com/missing' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: false, status: 404 });
  });
});

// ---------------------------------------------------------------------------
// HEAD 405 — fallback to GET
// ---------------------------------------------------------------------------

describe('GET /api/url-check — HEAD 405 falls back to GET', () => {
  it('retries with GET and returns ok:true when site rejects HEAD with 405', async () => {
    // First call: HEAD → 405
    mockFetch.mockResolvedValueOnce({ ok: false, status: 405 });
    // Second call: GET → 200
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await request(app)
      .get('/api/url-check')
      .query({ url: 'https://www.copperknob.co.uk/stepsheets/CJ5VSPX/afire-with-desire' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: 200 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://www.copperknob.co.uk/stepsheets/CJ5VSPX/afire-with-desire',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('retries with GET and returns ok:false when GET also returns a non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 405 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const res = await request(app)
      .get('/api/url-check')
      .query({ url: 'https://www.copperknob.co.uk/stepsheets/INVALID' });

    expect(res.body).toEqual({ ok: false, status: 404 });
  });
});

// ---------------------------------------------------------------------------
// YouTube oEmbed validation
// ---------------------------------------------------------------------------

describe('GET /api/url-check — YouTube oEmbed validation', () => {
  it('returns ok:true for a valid YouTube video URL', async () => {
    // oEmbed returns 200 for a real video
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await request(app)
      .get('/api/url-check')
      .query({ url: 'https://www.youtube.com/watch?v=yIe9HTIOSl4' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: 200 });
    // Must call oEmbed, not the original watch URL
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toContain('youtube.com/oembed');
    expect(mockFetch.mock.calls[0][0]).toContain(
      encodeURIComponent('https://www.youtube.com/watch?v=yIe9HTIOSl4'),
    );
  });

  it('returns ok:false for a YouTube URL with an invalid video ID', async () => {
    // oEmbed returns 404 for a non-existent video
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const res = await request(app)
      .get('/api/url-check')
      .query({ url: 'https://www.youtube.com/watch?v=yIe9HTIOSl4a' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: false, status: 404 });
  });

  it('also validates short youtu.be URLs via oEmbed', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await request(app)
      .get('/api/url-check')
      .query({ url: 'https://youtu.be/yIe9HTIOSl4' });

    expect(res.body.ok).toBe(true);
    expect(mockFetch.mock.calls[0][0]).toContain('youtube.com/oembed');
  });
});

// ---------------------------------------------------------------------------
// Network failure
// ---------------------------------------------------------------------------

describe('GET /api/url-check — network failure', () => {
  it('returns ok:false with null status when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const res = await request(app).get('/api/url-check').query({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: false, status: null });
  });
});
