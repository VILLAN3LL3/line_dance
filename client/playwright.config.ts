import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const e2eApiPort = 3101;
const e2eAppPort = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 2 : 0,
  globalTimeout: isCI ? 20 * 60 * 1000 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: isCI
    ? [["list"], ["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${e2eAppPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm --prefix ../server start",
      port: e2eApiPort,
      env: {
        ...process.env,
        PORT: String(e2eApiPort),
        CHOREOGRAPHY_DB_PATH: ":memory:",
        DANCE_GROUPS_DB_PATH: ":memory:",
        TAGS_DB_PATH: ":memory:",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${e2eAppPort}`,
      port: e2eAppPort,
      env: {
        ...process.env,
        VITE_API_URL: `http://127.0.0.1:${e2eApiPort}/api`,
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
