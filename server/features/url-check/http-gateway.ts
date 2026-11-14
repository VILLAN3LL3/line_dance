const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; LineDanceBot/1.0)' };

export async function requestUrl(
  url: string,
  method: 'HEAD' | 'GET',
  signal: AbortSignal,
): Promise<Response> {
  return fetch(url, { method, headers, signal, redirect: 'error' });
}
