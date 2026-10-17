import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const hookPath = fileURLToPath(new URL('../../../.husky/post-commit', import.meta.url));
let directory;
let binDirectory;
let environment;

function writeExecutable(path, content) {
  writeFileSync(path, `#!/bin/sh\n${content}\n`, { mode: 0o755 });
}

function installPm2(path) {
  writeExecutable(
    path,
    [
      'printf "pm2 %s\\n" "$*" >> "$COMMAND_LOG"',
      'case "$1" in',
      '  describe) exit "${DESCRIBE_STATUS:-0}" ;;',
      '  restart) exit "${RESTART_STATUS:-0}" ;;',
      '  start) exit "${START_STATUS:-0}" ;;',
      'esac',
    ].join('\n'),
  );
}

function runHook(overrides = {}) {
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
  directory = mkdtempSync(join(tmpdir(), 'line-dance-hook-'));
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
  writeExecutable(
    join(binDirectory, 'npm'),
    ['printf "npm %s\\n" "$*" >> "$COMMAND_LOG"', 'exit "${BUILD_STATUS:-0}"'].join('\n'),
  );
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('post-commit deployment', () => {
  it('finds PM2 in another nvm installation and restarts after building', () => {
    const pm2Directory = join(environment.NVM_DIR, 'versions/node/v20.19.4/bin');
    mkdirSync(pm2Directory, { recursive: true });
    installPm2(join(pm2Directory, 'pm2'));

    const result = runHook();

    expect(result.status).toBe(0);
    expect(result.commands.split('\n')).toEqual([
      'npm --prefix client run build',
      'pm2 describe line-dance',
      'pm2 restart line-dance --update-env',
      '',
    ]);
    expect(result.stdout).toContain('Deploy complete');
  });

  it('does not restart or report success when the build fails', () => {
    installPm2(join(binDirectory, 'pm2'));
    const result = runHook({ BUILD_STATUS: '1' });

    expect(result.status).not.toBe(0);
    expect(result.commands).not.toContain('pm2');
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
    expect(result.commands).toContain('pm2 start ecosystem.config.js');
  });

  it('fails before building when PM2 cannot be found', () => {
    const result = runHook();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('PM2 not found');
    expect(result.commands).toBe('');
  });
});
