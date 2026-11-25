import { defineConfig, devices } from '@playwright/test'

// e2e runs against `wrangler pages dev` (needs Node >= 22.12) and the REAL Supabase project from
// .env.local / .dev.vars, using throw-away seats ป.1/30/90-95 and temp users that are deleted afterwards.
// Build first (`pnpm build`) so dist/ is current.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8788',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec wrangler pages dev dist --port 8788 --kv RATE_LIMIT',
    url: 'http://127.0.0.1:8788/submit',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
