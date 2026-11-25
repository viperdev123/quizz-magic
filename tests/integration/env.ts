import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function parse(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
      if (m) out[m[1]!] = m[2]!.trim()
    }
  } catch {
    /* missing file -> handled by caller */
  }
  return out
}

const pub = parse('.env.local')
const secret = parse('.dev.vars')

export const env = {
  url: secret.SUPABASE_URL ?? pub.VITE_SUPABASE_URL ?? '',
  anonKey: pub.VITE_SUPABASE_ANON_KEY ?? '',
  serviceKey: secret.SUPABASE_SERVICE_ROLE_KEY ?? '',
}

export function assertEnv(): void {
  if (!env.url || !env.anonKey || !env.serviceKey) {
    throw new Error('Missing Supabase env: fill .env.local and .dev.vars first')
  }
}
