import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { mkdtempSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const serverDirectory = fileURLToPath(new URL('../..', import.meta.url));

function runMigrations(choreographyPath: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['migrations/run-migrations.ts'], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CHOREOGRAPHY_DB_PATH: choreographyPath,
      DANCE_GROUPS_DB_PATH: ':memory:',
      TAGS_DB_PATH: ':memory:',
      PM2_HOME: '',
    },
    encoding: 'utf8',
    timeout: 15_000,
  });
}

describe('migration CLI', () => {
  it('applies both migration sets to empty databases', () => {
    const result = runMigrations(':memory:');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('014_drop_legacy_choreography_information_columns');
    expect(result.stdout).toContain('014_backfill_planned_session_repetitions');
    expect(result.stdout).toContain('All migrations applied successfully.');
  });

  it('reports a failure and exits nonzero when the database cannot be opened', () => {
    const directory = mkdtempSync(join(tmpdir(), 'line-dance-migration-cli-'));
    const file = join(directory, 'not-a-directory');
    try {
      writeFileSync(file, '');
      const result = runMigrations(join(file, 'database.db'));

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Migration failed:');
      expect(result.stdout).not.toContain('All migrations applied successfully.');
    } finally {
      rmSync(file);
      rmdirSync(directory);
    }
  });
});
