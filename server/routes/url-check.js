import { checkUrl as check } from '../features/url-check/flow.js';

const errors = {
  missing_url: 'Missing url query parameter',
  invalid_url: 'Invalid URL',
  url_not_allowed: 'URL not allowed',
};

export async function checkUrl(req, res) {
  const result = await check(req.query.url);
  if (result.error) {
    const message = errors[result.error];
    if (!message) throw new Error(`Unknown URL check error: ${result.error}`);
    return res.status(400).json({ error: message });
  }
  return res.json(result.value);
}
