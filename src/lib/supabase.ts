import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Teacher-only client. Uses the public anon key + the teacher's own session; RLS enforces access.
// Students never use this: they go through /api/submit and /api/score.
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env is not configured')
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  return client
}
