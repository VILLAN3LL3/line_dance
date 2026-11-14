import { describe, expect, it } from 'vitest';
import {
  initialProbe,
  shouldRetryWithGet,
  validateUrl,
} from '../../features/url-check/operations.ts';

describe('URL check operations', () => {
  it('distinguishes missing, invalid and disallowed URLs', () => {
    expect(validateUrl(' ')).toEqual({ error: 'missing_url' });
    expect(validateUrl('not a URL')).toEqual({ error: 'invalid_url' });
    expect(validateUrl('http://localhost/test')).toEqual({ error: 'url_not_allowed' });
    expect(validateUrl('ftp://example.com')).toEqual({ error: 'url_not_allowed' });
    expect(validateUrl('https://example.com')).toEqual({ value: new URL('https://example.com/') });
  });

  it('uses oEmbed for YouTube and retries only rejected HEAD probes', () => {
    const youtube = initialProbe(new URL('https://youtu.be/123'));
    expect(youtube).toEqual({
      url: 'https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2F123&format=json',
      method: 'GET',
    });
    expect(shouldRetryWithGet(youtube, { status: 405 })).toBe(false);
    const normal = initialProbe(new URL('https://example.com/'));
    expect(normal).toEqual({ url: 'https://example.com/', method: 'HEAD' });
    expect(shouldRetryWithGet(normal, { status: 501 })).toBe(true);
    expect(shouldRetryWithGet(normal, { status: 404 })).toBe(false);
  });
});
