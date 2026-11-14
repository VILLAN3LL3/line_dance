import { DATABASE_RESTARTING_ERROR_CODE } from '../scripts/db.ts';

export function captureError(error) {
  if (error?.code === DATABASE_RESTARTING_ERROR_CODE) {
    throw error;
  }
  if (process.env.NODE_ENV === 'test') return;

  const details = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`[choreographies] ${details}\n`);
}
