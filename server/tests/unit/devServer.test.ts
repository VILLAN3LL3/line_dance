import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const manifest = z
  .object({
    scripts: z.object({ dev: z.string(), start: z.string() }),
    devDependencies: z.record(z.string(), z.string()),
  })
  .parse(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')));

describe('development server', () => {
  it('uses the native watcher without nodemon', () => {
    expect(manifest.scripts.dev).toBe('node --watch scripts/server.ts');
    expect(manifest.scripts.start).toBe('node scripts/server.ts');
    expect(manifest.devDependencies).not.toHaveProperty('nodemon');
  });

  it('restarts when an imported server file changes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'line-dance-watch-'));
    mkdirSync(join(directory, 'scripts'));
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    const dependencyPath = join(directory, 'scripts/value.ts');
    writeFileSync(dependencyPath, 'const value: string = "first"; export default value;');
    writeFileSync(
      join(directory, 'scripts/server.ts'),
      'import value from "./value.ts"; console.log(`READY:${value}`); setInterval(() => {}, 1000);',
    );
    const watcher = spawn(process.execPath, ['--watch', 'scripts/server.ts'], {
      cwd: directory,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    watcher.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      output += chunk;
    });
    watcher.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      output += chunk;
    });
    try {
      await vi.waitFor(() => expect(output).toContain('READY:first'), { timeout: 10000 });
      writeFileSync(dependencyPath, 'const value: string = "second"; export default value;');
      await vi.waitFor(() => expect(output).toContain('READY:second'), { timeout: 10000 });
    } finally {
      const closed = once(watcher, 'close');
      if (watcher.exitCode === null && watcher.signalCode === null) {
        watcher.kill('SIGTERM');
        await closed;
      }
      rmSync(directory, { recursive: true, force: true });
    }
  }, 25000);
});
