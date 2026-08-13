import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome'
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: 'node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3000',
        url: 'http://127.0.0.1:3000/',
        reuseExistingServer: true,
        timeout: 120_000
      }
})
