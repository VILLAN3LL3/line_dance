import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkUrl } from '../../features/url-check/flow.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('URL check integration flow', () => {
  it('uses the HTTP gateway and falls back from HEAD to GET', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetch);
    expect(await checkUrl('https://example.com')).toEqual({ value: { ok: true, status: 200 } });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/',
      expect.objectContaining({
        method: 'HEAD',
        redirect: 'error',
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://example.com/',
      expect.objectContaining({
        method: 'GET',
        redirect: 'error',
      }),
    );
  });

  it('rejects disallowed URLs without making a network request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await checkUrl('http://127.0.0.1')).toEqual({ error: 'url_not_allowed' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
