import { defineConfig, devices } from '@playwright/test'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `echo "Expecting app at ${APP_URL} via Docker Compose"`,
    url: APP_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
