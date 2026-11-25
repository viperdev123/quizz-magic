import type { Env } from '../_lib/env'

// Implemented in Phase 2 (Turnstile + rate limit + Supabase service role).
export const onRequestPost: PagesFunction<Env> = async () =>
  new Response(JSON.stringify({ ok: false, code: 'ERROR', message: 'ยังไม่เปิดใช้งาน' }), {
    status: 501,
    headers: { 'content-type': 'application/json' },
  })
