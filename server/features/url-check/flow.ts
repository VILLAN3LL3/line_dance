import { requestUrl } from './http-gateway.ts';
import { initialProbe, shouldRetryWithGet } from './operations.ts';
import type { AllowedUrl } from './operations.ts';

type UrlCheckResult = { value: { ok: boolean; status: number | null } };

export async function checkUrl(url: AllowedUrl): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const probe = initialProbe(url);
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
