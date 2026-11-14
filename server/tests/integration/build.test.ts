import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const sourceDirectory = fileURLToPath(new URL('../..', import.meta.url));
let fixture: string;
let serverDirectory: string;

const environment = {
  ...process.env,
  NODE_ENV: 'test',
  CHOREOGRAPHY_DB_PATH: '',
  DANCE_GROUPS_DB_PATH: '',
  TAGS_DB_PATH: '',
  PM2_HOME: '',
};

async function availablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No TCP port assigned');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

beforeAll(() => {
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: sourceDirectory,
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (build.status !== 0) throw new Error(`Backend build failed: ${build.stdout}\n${build.stderr}`);

  fixture = realpathSync(mkdtempSync(join(tmpdir(), 'line-dance-build-')));
  serverDirectory = join(fixture, 'server');
  mkdirSync(serverDirectory);
  mkdirSync(join(serverDirectory, 'data'));
  mkdirSync(join(fixture, 'client/dist'), { recursive: true });
  writeFileSync(join(fixture, 'client/dist/index.html'), 'compiled-client');
  cpSync(join(sourceDirectory, 'dist'), join(serverDirectory, 'dist'), { recursive: true });
  cpSync(join(sourceDirectory, 'assets'), join(serverDirectory, 'assets'), { recursive: true });
  cpSync(join(sourceDirectory, 'package.json'), join(serverDirectory, 'package.json'));
  symlinkSync(join(sourceDirectory, 'node_modules'), join(serverDirectory, 'node_modules'), 'dir');
}, 40_000);

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe('compiled backend', () => {
  it('runs both migration entry points against the original data directory', () => {
    const migrate = spawnSync(process.execPath, ['dist/migrations/run-migrations.js'], {
      cwd: serverDirectory,
      env: environment,
      encoding: 'utf8',
      timeout: 15_000,
    });
    expect(migrate.status, migrate.stderr).toBe(0);
    expect(migrate.stdout).toContain('All migrations applied successfully.');
    for (const name of ['line_dance.db', 'dance_groups.db', 'personal_data.db']) {
      expect(existsSync(join(serverDirectory, 'data', name))).toBe(true);
    }
    expect(existsSync(join(serverDirectory, 'dist/data'))).toBe(false);

    const legacy = spawnSync(
      process.execPath,
      [join(serverDirectory, 'dist/scripts/migrate-tags-to-personal-db.js')],
      {
        cwd: fixture,
        env: environment,
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
    expect(legacy.status, legacy.stderr).toBe(0);
  });

  it('resolves configured relative database paths from the server directory', () => {
    const migrate = spawnSync(process.execPath, ['dist/migrations/run-migrations.js'], {
      cwd: serverDirectory,
      env: {
        ...environment,
        CHOREOGRAPHY_DB_PATH: 'data/custom-choreography.db',
        DANCE_GROUPS_DB_PATH: 'data/custom-groups.db',
        TAGS_DB_PATH: 'data/custom-tags.db',
      },
      encoding: 'utf8',
      timeout: 15_000,
    });
    expect(migrate.status, migrate.stderr).toBe(0);
    for (const name of ['custom-choreography.db', 'custom-groups.db', 'custom-tags.db']) {
      expect(existsSync(join(serverDirectory, 'data', name))).toBe(true);
    }
  });

  it('loads PDF assets from the server directory', () => {
    const probe = `
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      const read = fs.readFileSync;
      const assets = [];
      fs.readFileSync = function(path, ...args) {
        const content = read.call(this, path, ...args);
        if (typeof path === 'string' && path.includes('/assets/')) assets.push(path);
        return content;
      };
      syncBuiltinESMExports();
      await import('./dist/routes/course-pdf-renderer.js');
      console.log(JSON.stringify(assets));
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {
      cwd: serverDirectory,
      env: environment,
      encoding: 'utf8',
      timeout: 15_000,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      join(serverDirectory, 'assets/icons8-mobile-phone-90.png'),
      join(serverDirectory, 'assets/icons8-email-90.png'),
      join(serverDirectory, 'assets/dancing.svg'),
    ]);
  });

  it('starts the compiled server and serves the API and built client', async () => {
    const port = await availablePort();
    const server = spawn(process.execPath, [join(serverDirectory, 'dist/scripts/server.js')], {
      cwd: fixture,
      env: { ...environment, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    server.stdout.setEncoding('utf8').on('data', (chunk: string) => (output += chunk));
    server.stderr.setEncoding('utf8').on('data', (chunk: string) => (output += chunk));
    try {
      await vi.waitFor(
        () => expect(output).toContain(`Server running on http://localhost:${port}`),
        {
          timeout: 15_000,
        },
      );
      const health = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(await health.json()).toEqual({ status: 'ok' });
      const client = await fetch(`http://127.0.0.1:${port}/`);
      expect(await client.text()).toBe('compiled-client');
    } finally {
      const closed = once(server, 'close');
      if (server.exitCode === null && server.signalCode === null) {
        server.kill('SIGINT');
        await closed;
      }
    }
  }, 20_000);
});
