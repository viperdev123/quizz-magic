import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] // VITE_TURNSTILE_SITE_KEY is optional

export default defineConfig(({ command, mode }) => {
  // A production bundle without these builds fine but is silently broken (teacher login fails), so stop here.
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = REQUIRED.filter((k) => !env[k]?.trim())
    if (missing.length)
      throw new Error(
        `Missing build variables: ${missing.join(', ')} (set them in .env.production)`,
      )
  }
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: {
      // forward /api to `wrangler pages dev` (port 8788) during `pnpm dev`
      proxy: { '/api': 'http://127.0.0.1:8788' },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
      exclude: ['tests/integration/**', 'node_modules/**'],
    },
  }
})
