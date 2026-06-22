const fs = require('node:fs');
const path = require('node:path');

// Load .env.pm2 for machine-local config (not checked in).
// Copy .env.pm2.example to .env.pm2 and fill in the values.
function loadEnvFile() {
  const envFile = path.join(__dirname, '.env.pm2');
  if (!fs.existsSync(envFile)) return {};
  return Object.fromEntries(
    fs.readFileSync(envFile, 'utf8')
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

module.exports = {
  apps: [
    {
      name: 'line-dance',
      script: './server/scripts/server.js',
      cwd: __dirname,
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
