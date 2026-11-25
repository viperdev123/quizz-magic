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

/** Remove test users left behind by an aborted earlier run (only @example.invalid addresses made by these tests). */
export async function sweepTestUsers(admin: {
  auth: { admin: { listUsers: (o: { perPage: number }) => Promise<{ data: { users: { id: string; email?: string }[] } }>; deleteUser: (id: string) => Promise<unknown> } }
}): Promise<void> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  for (const u of data.users) {
    if (u.email?.startsWith('itest-') && u.email.endsWith('@example.invalid')) await admin.auth.admin.deleteUser(u.id)
  }
}
