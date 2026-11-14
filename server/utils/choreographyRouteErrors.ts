import { isDatabaseRestartingError } from '../scripts/db.ts';

export function captureError(error: unknown): void {
  if (isDatabaseRestartingError(error)) {
    throw error;
  }
  if (process.env.NODE_ENV === 'test') return;

  const details = error instanceof Error ? error.stack || error.message : String(error); // NOSONAR -- preserve logging for non-Error thrown values
  process.stderr.write(`[choreographies] ${details}\n`);
}
