import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkUrl } from '../../features/url-check/flow.ts';
import { validateUrl } from '../../features/url-check/operations.ts';

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
    const url = validateUrl('https://example.com');
    if ('error' in url) throw new Error('Invalid test URL');
    expect(await checkUrl(url.value)).toEqual({
      value: { ok: true, status: 200 },
    });
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
});
