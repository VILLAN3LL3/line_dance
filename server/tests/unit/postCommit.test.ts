import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const hookPath = fileURLToPath(new URL('../../../.husky/post-commit', import.meta.url));
const pm2Tsconfig = fileURLToPath(new URL('../../tsconfig.pm2.json', import.meta.url));
const tscPath = fileURLToPath(new URL('../../node_modules/typescript/bin/tsc6', import.meta.url));
let directory: string;
let binDirectory: string;
let environment: {
  HOME: string;
  NVM_DIR: string;
  PATH: string;
  REPOSITORY_ROOT: string;
  COMMAND_LOG: string;
};

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, `#!/bin/sh\n${content}\n`, { mode: 0o755 });
}

function installPm2(path: string): void {
  writeExecutable(
    path,
    [
      'printf "pm2 %s\\n" "$*" >> "$COMMAND_LOG"',
      'case "$1" in',
      '  describe) exit "${DESCRIBE_STATUS:-0}" ;;',
      '  jlist) printf \'[{"name":"line-dance","pm2_env":{"pm_exec_path":"%s"}}]\\n\' "${PM2_ENTRYPOINT:-$REPOSITORY_ROOT/server/dist/scripts/server.js}" ;;',
      '  restart) exit "${RESTART_STATUS:-0}" ;;',
      '  start) exit "${START_STATUS:-0}" ;;',
      'esac',
    ].join('\n'),
  );
}

function runHook(
  overrides: NodeJS.ProcessEnv = {},
): SpawnSyncReturns<string> & { commands: string } {
  const result = spawnSync('/bin/sh', [hookPath], {
    env: { ...environment, ...overrides },
    encoding: 'utf8',
  });
  const commands = existsSync(environment.COMMAND_LOG)
    ? readFileSync(environment.COMMAND_LOG, 'utf8')
    : '';
  return { ...result, commands };
}

beforeEach(() => {
  directory = realpathSync(mkdtempSync(join(tmpdir(), 'line-dance-hook-')));
  binDirectory = join(directory, 'bin');
  mkdirSync(binDirectory);
  environment = {
    HOME: directory,
    NVM_DIR: join(directory, '.nvm'),
    PATH: binDirectory,
    REPOSITORY_ROOT: directory,
    COMMAND_LOG: join(directory, 'commands.log'),
  };
  writeExecutable(join(binDirectory, 'git'), 'printf "%s\\n" "$REPOSITORY_ROOT"');
  symlinkSync(process.execPath, join(binDirectory, 'node'));
  writeExecutable(
    join(binDirectory, 'npm'),
    ['printf "npm %s\\n" "$*" >> "$COMMAND_LOG"', 'exit "${BUILD_STATUS:-0}"'].join('\n'),
  );
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('post-commit deployment', () => {
  it('builds a CommonJS PM2 config that resolves local settings and paths from the repository root', () => {
    const outputDirectory = join(directory, 'server/dist/pm2');
    const build = spawnSync(
      process.execPath,
      [tscPath, '-p', pm2Tsconfig, '--outDir', outputDirectory],
      {
        encoding: 'utf8',
      },
    );
    expect(build.status, build.stdout + build.stderr).toBe(0);

    const configPath = join(outputDirectory, 'ecosystem.config.cjs');
    const loadConfig = (): SpawnSyncReturns<string> =>
      spawnSync(
        process.execPath,
        ['-e', 'console.log(JSON.stringify(require(process.argv[1])))', configPath],
        {
          cwd: binDirectory,
          encoding: 'utf8',
        },
      );

    const missingEnv = loadConfig();
    expect(missingEnv.status).not.toBe(0);
    expect(missingEnv.stderr).toContain('NODE_BINARY is not set');

    writeFileSync(
      join(directory, '.env.pm2'),
      `# Local settings\nNODE_BINARY=${process.execPath}\n`,
    );
    const loaded = loadConfig();
    expect(loaded.status, loaded.stderr).toBe(0);
    expect(JSON.parse(loaded.stdout)).toMatchObject({
      apps: [
        {
          name: 'line-dance',
          cwd: directory,
          script: './server/dist/scripts/server.js',
          interpreter: process.execPath,
          env: { NODE_ENV: 'production', PORT: 3001 },
        },
      ],
    });
  });

  it('finds PM2 in another nvm installation and restarts after building', () => {
    const pm2Directory = join(environment.NVM_DIR, 'versions/node/v20.19.4/bin');
    mkdirSync(pm2Directory, { recursive: true });
    installPm2(join(pm2Directory, 'pm2'));

    const result = runHook();

    expect(result.status).toBe(0);
    expect(result.commands.split('\n')).toEqual([
      'pm2 describe line-dance',
      'pm2 jlist',
      'npm --prefix server run build',
      'npm --prefix server run build:pm2',
      'npm --prefix client run build',
      'pm2 restart line-dance --update-env',
      '',
    ]);
    expect(result.stdout).toContain('Deploy complete');
  });

  it('does not restart or report success when the build fails', () => {
    installPm2(join(binDirectory, 'pm2'));
    const result = runHook({ BUILD_STATUS: '1' });

    expect(result.status).not.toBe(0);
    expect(result.commands).not.toContain('pm2 restart');
    expect(result.commands).not.toContain('pm2 start');
    expect(result.stdout).not.toContain('Deploy complete');
  });

  it('does not mask restart failures by starting another process', () => {
    installPm2(join(binDirectory, 'pm2'));
    const result = runHook({ RESTART_STATUS: '1' });

    expect(result.status).not.toBe(0);
    expect(result.commands).not.toContain('pm2 start ');
    expect(result.stdout).not.toContain('Deploy complete');
  });

  it('starts the configured service when it is not registered', () => {
    installPm2(join(binDirectory, 'pm2'));
    const result = runHook({ DESCRIBE_STATUS: '1' });

    expect(result.status).toBe(0);
    expect(result.commands).toContain('pm2 start server/dist/pm2/ecosystem.config.cjs');
  });

  it('fails before building when PM2 cannot be found', () => {
    const result = runHook();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('PM2 not found');
    expect(result.commands).toBe('');
  });

  it('refuses to restart a process registered with the old TypeScript entry point', () => {
    installPm2(join(binDirectory, 'pm2'));
    const result = runHook({ PM2_ENTRYPOINT: join(directory, 'server/scripts/server.ts') });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('different entry point');
    expect(result.commands).not.toContain('npm ');
    expect(result.commands).not.toContain('pm2 restart');
  });
});
