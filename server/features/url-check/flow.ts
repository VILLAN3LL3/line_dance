import { requestUrl } from './http-gateway.ts';
import { initialProbe, shouldRetryWithGet, validateUrl } from './operations.ts';

export async function checkUrl(raw: unknown) {
  const validation = validateUrl(raw);
  if ('error' in validation) return validation;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const probe = initialProbe(validation.value);
    let response = await requestUrl(probe.url, probe.method, controller.signal);
    if (shouldRetryWithGet(probe, response)) {
      response = await requestUrl(probe.url, 'GET', controller.signal);
    }
    return { value: { ok: response.ok, status: response.status } };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      const name = error instanceof Error ? error.name : 'Unknown error';
      process.stderr.write(`[url-check] Request failed: ${name}\n`);
    }
    return { value: { ok: false, status: null } };
  } finally {
    clearTimeout(timeout);
  }
}
