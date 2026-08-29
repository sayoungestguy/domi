import { defineConfig, devices } from '@playwright/test';

const apiURL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3100';
const webURL = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:8082';
const runAllBrowsers = process.env.E2E_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: webURL,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  metadata: { apiURL, webURL },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(runAllBrowsers ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] : []),
  ],
  webServer: process.env.E2E_EXTERNAL_SERVERS === '1'
    ? undefined
    : [
        {
          name: 'Domi API',
          command: 'bin/e2e-api',
          cwd: '../..',
          url: `${apiURL}/api/v1/health`,
          reuseExistingServer: false,
          timeout: 180_000,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
          stdout: 'ignore',
          stderr: 'pipe',
        },
        {
          name: 'Expo web',
          command: 'npm --prefix apps/mobile run web -- --port 8082',
          cwd: '../..',
          env: {
            CI: '1',
            EXPO_PUBLIC_API_URL: apiURL,
          },
          url: webURL,
          reuseExistingServer: false,
          timeout: 120_000,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ],
});
