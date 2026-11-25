// Best-effort fixed-window limiter on Workers KV. KV is eventually consistent, so counts are
// approximate; Turnstile is the primary abuse control. IPs are hashed before being used as keys.

export interface KvLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Returns true when the request is allowed. Fails open if KV is unavailable. */
export async function checkRateLimit(
  kv: KvLike,
  route: string,
  ip: string,
  limit: number,
  windowSec: number,
  nowMs: number = Date.now(),
): Promise<boolean> {
  try {
    const window = Math.floor(nowMs / 1000 / windowSec)
    const key = `rl:${route}:${(await sha256Hex(ip)).slice(0, 32)}:${window}`
    const count = Number.parseInt((await kv.get(key)) ?? '0', 10) || 0
    if (count >= limit) return false
    await kv.put(key, String(count + 1), { expirationTtl: Math.max(60, windowSec * 2) })
    return true
  } catch {
    return true
  }
}
