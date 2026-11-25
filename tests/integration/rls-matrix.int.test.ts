import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assertEnv, env, sweepTestUsers } from './env'

// Matrix: {anon, signed-in non-teacher} x {teachers, submissions, grades} x {select, insert, update, delete}.
// Every attempt must fail or affect nothing, and the database must be byte-for-byte unchanged afterwards.
const SEATS = { a: { level: 'ป.1', room: 30, student_no: 98 }, b: { level: 'ป.1', room: 30, student_no: 97 } }
const NEW_SEAT = { level: 'ป.1', room: 30, student_no: 96 }
const WORDS = [1, 2, 3, 4].map((n) => ({ word: `w${n}`, reason: `r${n}` }))
const sub = (seat: typeof NEW_SEAT) => ({
  ...seat,
  student_name: 'matrix',
  name_norm: 'matrix',
  digits: [1, 2, 3, 4],
  drawn_nouns: ['a', 'b', 'c', 'd'],
  words: WORDS,
})
const opts = { auth: { persistSession: false, autoRefreshToken: false } }

let admin: SupabaseClient
const clients: Record<string, SupabaseClient> = {}
const userIds: string[] = []
let idA = ''
let idB = ''
let teacherId = ''

async function snapshot() {
  const s = await admin.from('submissions').select('*').eq('level', 'ป.1').eq('room', 30).order('student_no')
  const g = await admin.from('grades').select('*').in('submission_id', [idA, idB]).order('submission_id')
  const t = await admin.from('teachers').select('*').order('user_id')
  return JSON.stringify({ s: s.data, g: g.data, t: t.data })
}

async function tempUser(isTeacher: boolean) {
  const email = `itest-matrix-${randomUUID().slice(0, 8)}@example.invalid`
  const password = randomUUID() + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error('create user: ' + error?.message)
  userIds.push(data.user.id)
  if (isTeacher) {
    const r = await admin.from('teachers').insert({ user_id: data.user.id })
    if (r.error) throw new Error('mark teacher: ' + r.error.message)
  }
  const c = createClient(env.url, env.anonKey, opts)
  const { error: se } = await c.auth.signInWithPassword({ email, password })
  if (se) throw new Error('sign in: ' + se.message)
  return { client: c, id: data.user.id }
}

async function cleanup() {
  await admin.from('submissions').delete().eq('level', 'ป.1').eq('room', 30).in('student_no', [96, 97, 98])
  for (const id of userIds) await admin.auth.admin.deleteUser(id)
}

beforeAll(async () => {
  assertEnv()
  admin = createClient(env.url, env.serviceKey, opts)
  await sweepTestUsers(admin)
  const taken = await admin.from('submissions').select('id').eq('level', 'ป.1').eq('room', 30).in('student_no', [96, 97, 98])
  if (taken.data?.length) throw new Error('Matrix test seats ป.1/30/96-98 already used - refusing to run')

  const a = await admin.from('submissions').insert(sub(SEATS.a)).select('id').single()
  const b = await admin.from('submissions').insert(sub(SEATS.b)).select('id').single()
  idA = (a.data as { id: string }).id
  idB = (b.data as { id: string }).id
  await admin.from('grades').insert({ submission_id: idA, marks: [true, true, true, true], comments: ['', '', '', ''] })

  clients.anon = createClient(env.url, env.anonKey, opts)
  const student = await tempUser(false)
  clients['signed-in non-teacher'] = student.client
  teacherId = (await tempUser(true)).id // a teacher row exists for the others to try to read/alter
})

afterAll(async () => {
  if (admin) await cleanup()
})

for (const role of ['anon', 'signed-in non-teacher']) {
  describe(`${role}: every operation on every table is blocked`, () => {
    it('SELECT returns nothing on all tables', async () => {
      const c = clients[role]!
      for (const table of ['teachers', 'submissions', 'grades']) {
        const { data, error } = await c.from(table).select('*')
        expect(error !== null || (data ?? []).length === 0, `${table} readable`).toBe(true)
      }
    })

    it('INSERT is rejected on all tables', async () => {
      const c = clients[role]!
      expect((await c.from('submissions').insert(sub(NEW_SEAT))).error, 'submissions').not.toBeNull()
      expect((await c.from('grades').insert({ submission_id: idB, marks: [true, true, true, true], comments: ['', '', '', ''] })).error, 'grades').not.toBeNull()
      expect((await c.from('teachers').insert({ user_id: randomUUID() })).error, 'teachers').not.toBeNull()
    })

    it('UPDATE and DELETE change nothing on all tables', async () => {
      const c = clients[role]!
      const before = await snapshot()
      await c.from('submissions').update({ student_name: 'hacked' }).eq('id', idA)
      await c.from('submissions').update({ student_name: 'hacked' }).neq('id', randomUUID())
      await c.from('grades').update({ marks: [false, false, false, false] }).eq('submission_id', idA)
      await c.from('teachers').update({ created_at: '2000-01-01' }).eq('user_id', teacherId)
      await c.from('grades').delete().eq('submission_id', idA)
      await c.from('submissions').delete().eq('id', idA)
      await c.from('teachers').delete().eq('user_id', teacherId)
      expect(await snapshot()).toBe(before)
    })

    it('cannot call the submit function or become a teacher', async () => {
      const c = clients[role]!
      const rpc = await c.rpc('submit_worksheet', {
        p_level: 'ป.1', p_room: 30, p_student_no: 96, p_name: 'x', p_name_norm: 'x',
        p_digits: [1, 2, 3, 4], p_nouns: ['a', 'b', 'c', 'd'], p_words: WORDS,
      })
      expect(rpc.error).not.toBeNull()
      expect((await c.rpc('is_teacher')).data ?? false).toBe(false)
    })
  })
}

describe('database is unchanged after the whole matrix', () => {
  it('no stray rows were created', async () => {
    const { data } = await admin.from('submissions').select('student_no').eq('level', 'ป.1').eq('room', 30).in('student_no', [96, 97, 98])
    expect((data ?? []).map((r) => (r as { student_no: number }).student_no).sort()).toEqual([97, 98])
  })
})
