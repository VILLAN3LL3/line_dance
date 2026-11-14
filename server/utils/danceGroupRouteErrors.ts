import { isDatabaseRestartingError } from '../scripts/db.ts';

export function captureDanceGroupError(error: unknown): void {
  if (isDatabaseRestartingError(error)) {
    throw error;
  }
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  const details = error instanceof Error ? error.stack || error.message : String(error); // NOSONAR -- preserve logging for non-Error thrown values
  process.stderr.write(`[dance-groups] ${details}\n`);
}
