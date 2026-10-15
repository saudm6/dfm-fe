import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Workers load this file after the web server has started, so E2E_PORT is set by then.
    baseURL: `http://localhost:${process.env['E2E_PORT']}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Port 0 makes ng serve pick a free port; the named group publishes it as E2E_PORT.
    command: 'npm start -- --port 0',
    wait: { stdout: /Local:\s+http:\/\/localhost:(?<e2e_port>\d+)/ },
    timeout: 120_000,
  },
});
