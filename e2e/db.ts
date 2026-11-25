import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import '../tests/integration/setup'
import { assertEnv, env, sweepTestUsers } from '../tests/integration/env'

export const SEAT = { level: 'ม.1', room: 30, student_no: 94 }
export const SEAT_NOS = [90, 91, 92, 93, 94, 95]

export interface TempTeacher {
  admin: SupabaseClient
  email: string
  password: string
  userId: string
}

export async function setup(): Promise<TempTeacher> {
  assertEnv()
  const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  await sweepTestUsers(admin)
  const taken = await admin.from('submissions').select('id').eq('level', 'ม.1').eq('room', 30).in('student_no', SEAT_NOS)
  if (taken.data?.length) throw new Error('e2e seats ม.1/30/90-95 already used - refusing to run')
  const email = `itest-e2e-${randomUUID().slice(0, 8)}@example.invalid`
  const password = randomUUID() + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error('could not create temp teacher')
  const r = await admin.from('teachers').insert({ user_id: data.user.id })
  if (r.error) throw new Error('could not mark temp teacher')
  return { admin, email, password, userId: data.user.id }
}

export async function teardown(t: TempTeacher): Promise<void> {
  await t.admin.from('submissions').delete().eq('level', 'ม.1').eq('room', 30).in('student_no', SEAT_NOS)
  await t.admin.auth.admin.deleteUser(t.userId)
  await sweepTestUsers(t.admin)
}
