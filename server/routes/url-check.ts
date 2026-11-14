import type { Request, Response } from 'express';
import { checkUrl as check } from '../features/url-check/flow.ts';
import { validateUrl } from '../features/url-check/operations.ts';
import type { UrlValidationError, UrlValidationResult } from '../features/url-check/operations.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';

const errors: Record<UrlValidationError, string> = {
  missing_url: 'Missing url query parameter',
  invalid_url: 'Invalid URL',
  url_not_allowed: 'URL not allowed',
};
type UrlCheckResponse = { ok: boolean; status: number | null } | { error: string };

export const prepareUrl = prepareInput((req) => req.query.url, validateUrl);

export async function checkUrl(
  _req: Request,
  res: Response<UrlCheckResponse, { input: PreparedInput<UrlValidationResult> }>,
): Promise<Response<UrlCheckResponse>> {
  const input = res.locals.input;
  if ('exception' in input) throw input.exception;
  if ('error' in input) {
    const message = errors[input.error];
    if (!message) throw new Error(`Unknown URL check error: ${input.error}`);
    return res.status(400).json({ error: message });
  }
  const result = await check(input.value);
  return res.json(result.value);
}
