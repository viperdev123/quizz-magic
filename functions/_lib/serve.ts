import type { Env } from './env'
import { handleScore, handleSubmit, type Guards } from './handlers'
import { checkRateLimit } from './ratelimit'
import { createStores } from './supabaseStore'
import { verifyTurnstile } from './turnstile'

const MAX_BODY = 20_000

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function serve(request: Request, env: Env, kind: 'submit' | 'score'): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'

  let body: unknown = null
  const length = Number(request.headers.get('content-length') ?? '0')
  if (length <= MAX_BODY) {
    try {
      const text = await request.text()
      if (text.length <= MAX_BODY) body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  const guards: Guards = {
    rateLimit: (route, limit, windowSec) => checkRateLimit(env.RATE_LIMIT, route, ip, limit, windowSec),
    verifyTurnstile: (token) => verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip === 'unknown' ? null : ip),
  }
  const stores = createStores(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const result =
    kind === 'submit'
      ? await handleSubmit(body, guards, stores.submit)
      : await handleScore(body, guards, stores.score)
  return json(result.status, result.body)
}
