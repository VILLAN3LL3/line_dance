import { z } from 'zod';

const privateHostnamePattern =
  /^(localhost|.*\.local|.*\.internal)$|^127\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./;

const youtubeHostnames = new Set(['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com']);
const urlInputSchema = z.string().refine((value) => value.trim().length > 0);
const allowedUrlSchema = z
  .instanceof(URL)
  .refine(
    (url) =>
      !privateHostnamePattern.test(url.hostname) &&
      (url.protocol === 'http:' || url.protocol === 'https:'),
  )
  .brand<'AllowedUrl'>();

export type AllowedUrl = z.output<typeof allowedUrlSchema>;
export type UrlValidationError = 'missing_url' | 'invalid_url' | 'url_not_allowed';
export type UrlValidationResult = { error: UrlValidationError } | { value: AllowedUrl };
export type UrlProbe = { url: string; method: 'HEAD' | 'GET' };

export function validateUrl(raw: unknown): UrlValidationResult {
  const input = urlInputSchema.safeParse(raw);
  if (!input.success) return { error: 'missing_url' };
  let parsed;
  try {
    parsed = new URL(input.data);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return { error: 'invalid_url' };
  }
  const allowed = allowedUrlSchema.safeParse(parsed);
  if (!allowed.success) return { error: 'url_not_allowed' };
  return { value: allowed.data };
}

export function initialProbe(parsed: URL): UrlProbe {
  if (youtubeHostnames.has(parsed.hostname)) {
    return {
      url: `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.href)}&format=json`,
      method: 'GET',
    };
  }
  return { url: parsed.href, method: 'HEAD' };
}

export function shouldRetryWithGet(probe: UrlProbe, response: { status: number }): boolean {
  return probe.method === 'HEAD' && (response.status === 405 || response.status === 501);
}
