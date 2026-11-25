export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string // secret
  TURNSTILE_SECRET_KEY: string // secret
  RATE_LIMIT: KVNamespace
}
