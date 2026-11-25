import { defineConfig } from 'vitest/config'

// Integration tests run against the REAL Supabase project configured in .env.local / .dev.vars.
// Run explicitly with `pnpm test:int`; they are excluded from `pnpm test` and CI.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.int.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
