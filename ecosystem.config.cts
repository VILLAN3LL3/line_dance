import fs = require('node:fs');
import path = require('node:path');

const root = path.resolve(__dirname, '../../..');

// Load .env.pm2 for machine-local config (not checked in).
// Copy .env.pm2.example to .env.pm2 and fill in the values.
function loadEnvFile(): Record<string, string> {
  const envFile = path.join(root, '.env.pm2');
  if (!fs.existsSync(envFile)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envFile, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => line.split('=').map((s) => s.trim()))
      .filter(([k, v]) => k && v),
  );
}

const localEnv = loadEnvFile();

if (!localEnv.NODE_BINARY) {
  throw new Error(
    'NODE_BINARY is not set. Copy .env.pm2.example to .env.pm2 and fill in the values.',
  );
}

export = {
  apps: [
    {
      name: 'line-dance',
      script: './server/dist/scripts/server.js',
      cwd: root,
      interpreter: localEnv.NODE_BINARY,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};
