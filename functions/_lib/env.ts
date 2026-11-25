import type { KvLike } from './ratelimit'

export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string // secret
  TURNSTILE_SECRET_KEY?: string // secret; optional: when unset, human verification is off
  RATE_LIMIT: KvLike // Workers KV namespace binding (structurally compatible)
}
