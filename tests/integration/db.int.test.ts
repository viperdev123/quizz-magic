import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleScore, type Guards } from '../../functions/_lib/handlers'
import { createStores } from '../../functions/_lib/supabaseStore'
import { normalizeName } from '../../shared/normalize'
import { assertEnv, env } from './env'

// A seat that real students will never use; the suite refuses to run if it is already taken
// so it can never touch real data, and removes only its own rows afterwards.
const SEAT = { level: 'ป.1', room: 30, student_no: 99 }
const NAME = 'ผู้ทดสอบ ระบบ'
const WORDS = [
  { word: 'แมว', reason: 'สัตว์' },
  { word: 'โรงเรียน', reason: 'สถานที่' },
  { word: 'ดินสอ', reason: 'สิ่งของ' },
  { word: 'ความสุข', reason: 'นามธรรม' },
]
const rpcArgs = (name: string, words = WORDS) => ({
  p_level: SEAT.level,
  p_room: SEAT.room,
  p_student_no: SEAT.student_no,
  p_name: name,
  p_name_norm: normalizeName(name),
  p_digits: [2, 5, 7, 9],
  p_nouns: ['แมว', 'โรงเรียน', 'ดินสอ', 'ความสุข'],
  p_words: words,
})

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
let admin: SupabaseClient
let anon: SupabaseClient
let nonTeacher: SupabaseClient
let teacher: SupabaseClient
const createdUsers: string[] = []

async function tempUser(label: string, makeTeacher: boolean): Promise<SupabaseClient> {
  const email = `itest-${label}-${randomUUID().slice(0, 8)}@example.invalid`
  const password = randomUUID() + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error('could not create temp user: ' + (error?.message ?? 'no user'))
  createdUsers.push(data.user.id)
  if (makeTeacher) {
    const { error: e } = await admin.from('teachers').insert({ user_id: data.user.id })
    if (e) throw new Error('could not mark temp teacher: ' + e.code + ' ' + e.message)
  }
  const c = createClient(env.url, env.anonKey, opts)
  const { error: se } = await c.auth.signInWithPassword({ email, password })
  if (se) throw new Error('temp user sign-in failed: ' + se.message)
  return c
}

async function resetSeat() {
  await admin.from('submissions').delete().match(SEAT) // grades cascade
}
async function seatId(): Promise<string | null> {
  const { data } = await admin.from('submissions').select('id').match(SEAT).maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

beforeAll(async () => {
  assertEnv()
  admin = createClient(env.url, env.serviceKey, opts)
  anon = createClient(env.url, env.anonKey, opts)
  const { data } = await admin.from('submissions').select('id').match(SEAT).maybeSingle()
  if (data) throw new Error('Test seat ป.1/30/99 already exists - refusing to run (would delete data)')
  nonTeacher = await tempUser('student', false)
  teacher = await tempUser('teacher', true)
})

afterAll(async () => {
  if (!admin) return
  await resetSeat()
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id)
})

describe('anon role cannot touch any table (RLS + revoked grants)', () => {
  beforeAll(async () => {
    await resetSeat()
    await admin.rpc('submit_worksheet', rpcArgs(NAME))
  })

  for (const table of ['teachers', 'submissions', 'grades']) {
    it(`cannot read ${table}`, async () => {
      const { data, error } = await anon.from(table).select('*')
      expect(error !== null || (data ?? []).length === 0).toBe(true)
    })
  }
  it('cannot insert, update or delete', async () => {
    const ins = await anon.from('submissions').insert({ ...SEAT, student_name: 'x', name_norm: 'x', digits: [1, 2, 3, 4], drawn_nouns: ['a', 'b', 'c', 'd'], words: WORDS })
    expect(ins.error).not.toBeNull()
    await anon.from('submissions').update({ student_name: 'hacked' }).match(SEAT)
    await anon.from('submissions').delete().match(SEAT)
    const { data } = await admin.from('submissions').select('student_name').match(SEAT).single()
    expect((data as { student_name: string }).student_name).toBe(NAME)
    expect((await anon.from('grades').insert({ submission_id: randomUUID(), marks: [true, true, true, true], comments: ['', '', '', ''] })).error).not.toBeNull()
  })
  it('cannot call submit_worksheet', async () => {
    expect((await anon.rpc('submit_worksheet', rpcArgs('anon'))).error).not.toBeNull()
  })
})

describe('signed-in NON-teacher sees and changes nothing', () => {
  it('reads return no rows', async () => {
    for (const table of ['teachers', 'submissions', 'grades']) {
      const { data, error } = await nonTeacher.from(table).select('*')
      expect(error !== null || (data ?? []).length === 0).toBe(true)
    }
  })
  it('cannot grade, edit or delete', async () => {
    const id = await seatId()
    expect(id).not.toBeNull()
    const g = await nonTeacher.from('grades').insert({ submission_id: id, marks: [true, true, true, true], comments: ['', '', '', ''] })
    expect(g.error).not.toBeNull()
    await nonTeacher.from('submissions').update({ student_name: 'hacked' }).eq('id', id!)
    await nonTeacher.from('submissions').delete().eq('id', id!)
    const { data } = await admin.from('submissions').select('student_name').eq('id', id!).single()
    expect((data as { student_name: string }).student_name).toBe(NAME)
    expect((await admin.from('grades').select('*').eq('submission_id', id!)).data).toHaveLength(0)
  })
  it('cannot make itself a teacher or call submit_worksheet', async () => {
    const { data: me } = await nonTeacher.auth.getUser()
    expect((await nonTeacher.from('teachers').insert({ user_id: me.user!.id })).error).not.toBeNull()
    expect((await nonTeacher.rpc('submit_worksheet', rpcArgs('x'))).error).not.toBeNull()
  })
})

describe('teacher access', () => {
  it('can read submissions but cannot create or edit them', async () => {
    const { data } = await teacher.from('submissions').select('id, student_name').match(SEAT)
    expect(data).toHaveLength(1)
    expect((await teacher.from('submissions').insert({ ...SEAT, room: 29, student_name: 'x', name_norm: 'x', digits: [1, 2, 3, 4], drawn_nouns: ['a', 'b', 'c', 'd'], words: WORDS })).error).not.toBeNull()
    await teacher.from('submissions').update({ student_name: 'hacked' }).match(SEAT)
    const { data: after } = await admin.from('submissions').select('student_name').match(SEAT).single()
    expect((after as { student_name: string }).student_name).toBe(NAME)
  })
  it('cannot write the teachers table', async () => {
    expect((await teacher.from('teachers').insert({ user_id: randomUUID() })).error).not.toBeNull()
  })
  it('grades: total is derived from marks (a forged total is ignored) and re-grading replaces', async () => {
    const id = (await seatId())!
    const first = await teacher
      .from('grades')
      .upsert({ submission_id: id, marks: [true, false, false, false], comments: ['', '', '', ''], total: 4, note: 'a' })
      .select('total, graded_by')
      .single()
    expect(first.error).toBeNull()
    expect((first.data as { total: number }).total).toBe(1)
    const second = await teacher
      .from('grades')
      .upsert({ submission_id: id, marks: [true, true, true, false], comments: ['', '', '', 'ลองอีก'], note: 'b' })
      .select('total')
      .single()
    expect((second.data as { total: number }).total).toBe(3)
    const { data } = await admin.from('grades').select('*').eq('submission_id', id)
    expect(data).toHaveLength(1)
  })
  it('requires all four marks', async () => {
    const id = (await seatId())!
    const bad = await teacher.from('grades').upsert({ submission_id: id, marks: [true, true], comments: ['', '', '', ''] })
    expect(bad.error).not.toBeNull()
  })
})

describe('submit_worksheet business rules (2-4)', () => {
  it('new -> ok; same name again before grading -> overwritten (rule 4)', async () => {
    await resetSeat()
    expect((await admin.rpc('submit_worksheet', rpcArgs(NAME))).data).toBe('ok')
    const changed = WORDS.map((w) => ({ ...w, reason: 'แก้ไขแล้ว' }))
    expect((await admin.rpc('submit_worksheet', rpcArgs('  ผู้ทดสอบ   ระบบ ', changed))).data).toBe('ok')
    const { data } = await admin.from('submissions').select('words').match(SEAT).single()
    expect((data as { words: typeof WORDS }).words[0]!.reason).toBe('แก้ไขแล้ว')
  })
  it('different name on the same seat -> mismatch, data untouched (rule 3)', async () => {
    expect((await admin.rpc('submit_worksheet', rpcArgs('คนอื่น ที่ไม่ใช่'))).data).toBe('mismatch')
    const { data } = await admin.from('submissions').select('student_name').match(SEAT).single()
    expect((data as { student_name: string }).student_name).not.toBe('คนอื่น ที่ไม่ใช่')
  })
  it('after grading: same name -> locked (rule 2); different name -> mismatch', async () => {
    const id = (await seatId())!
    await admin.from('grades').upsert({ submission_id: id, marks: [true, true, true, true], comments: ['', '', '', ''] })
    expect((await admin.rpc('submit_worksheet', rpcArgs(NAME))).data).toBe('locked')
    expect((await admin.rpc('submit_worksheet', rpcArgs('คนอื่น ที่ไม่ใช่'))).data).toBe('mismatch')
  })
  it('database CHECK constraints reject a digit above 9 and wrong lengths', async () => {
    const base = { ...SEAT, room: 29, student_name: 'x', name_norm: 'x', drawn_nouns: ['a', 'b', 'c', 'd'], words: WORDS }
    expect((await admin.from('submissions').insert({ ...base, digits: [1, 2, 3, 10] })).error).not.toBeNull()
    expect((await admin.from('submissions').insert({ ...base, digits: [1, 2, 3] })).error).not.toBeNull()
    expect((await admin.from('submissions').insert({ ...base, digits: [1, 2, 3, 4], drawn_nouns: ['a'] })).error).not.toBeNull()
  })
})

describe('/api/score handler against the real database', () => {
  const guards: Guards = { rateLimit: async () => true, verifyTurnstile: async () => true }
  const body = { level: SEAT.level, room: SEAT.room, studentNo: SEAT.student_no, turnstileToken: 't' }

  it('not_found, waiting, then graded with per-word marks', async () => {
    const { score } = createStores(env.url, env.serviceKey)
    const missing = await handleScore({ ...body, studentNo: 98 }, guards, score)
    expect(missing.body).toEqual({ status: 'not_found' })

    await resetSeat()
    await admin.rpc('submit_worksheet', rpcArgs(NAME))
    const waiting = await handleScore(body, guards, score)
    expect(waiting.body).toMatchObject({ status: 'waiting', name: NAME })

    const id = (await seatId())!
    await admin.from('grades').upsert({ submission_id: id, marks: [true, true, true, false], comments: ['', '', '', 'ลองอีกนิด'], note: 'เก่ง' })
    const graded = await handleScore(body, guards, score)
    expect(graded.body).toMatchObject({ status: 'graded', total: 3, note: 'เก่ง' })
    const items = (graded.body as unknown as { items: { correct: boolean; comment: string | null }[] }).items
    expect(items.map((i) => i.correct)).toEqual([true, true, true, false])
    expect(items[3]!.comment).toBe('ลองอีกนิด')
  })
})
