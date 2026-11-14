const privateHostnamePattern =
  /^(localhost|.*\.local|.*\.internal)$|^127\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./;

const youtubeHostnames = new Set(['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com']);

export type UrlValidationError = 'missing_url' | 'invalid_url' | 'url_not_allowed';
export type UrlValidationResult = { error: UrlValidationError } | { value: URL };
export type UrlProbe = { url: string; method: 'HEAD' | 'GET' };

export function validateUrl(raw: unknown): UrlValidationResult {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'missing_url' };
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return { error: 'invalid_url' };
  }
  if (
    privateHostnamePattern.test(parsed.hostname) ||
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
  ) {
    return { error: 'url_not_allowed' };
  }
  return { value: parsed };
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
