const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; LineDanceBot/1.0)' };

export function requestUrl(url, method, signal) {
  return fetch(url, { method, headers, signal, redirect: 'error' });
}
