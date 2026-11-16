import { defineConfig } from '@playwright/test';
const BASE = process.env.BASE_PATH || '/';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  reporter: 'line',
  use: {
    baseURL: `http://localhost:4321${BASE}`,
    launchOptions: { executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' },
    trace: 'off',
  },
  webServer: {
    command: 'node tests/serve.mjs',
    port: 4321,
    reuseExistingServer: false,
  },
});
