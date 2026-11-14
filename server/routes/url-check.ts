import type { Request, Response } from 'express';
import { checkUrl as check } from '../features/url-check/flow.ts';
import type { UrlValidationError } from '../features/url-check/operations.ts';

const errors: Record<UrlValidationError, string> = {
  missing_url: 'Missing url query parameter',
  invalid_url: 'Invalid URL',
  url_not_allowed: 'URL not allowed',
};

export async function checkUrl(req: Request, res: Response): Promise<Response> {
  const result = await check(req.query.url);
  if ('error' in result) {
    const message = errors[result.error];
    if (!message) throw new Error(`Unknown URL check error: ${result.error}`);
    return res.status(400).json({ error: message });
  }
  return res.json(result.value);
}
