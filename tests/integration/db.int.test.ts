import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleScore, handleSubmit, type Guards } from '../../functions/_lib/handlers'
import { createStores } from '../../functions/_lib/supabaseStore'
import { normalizeName } from '../../shared/normalize'
import { assertEnv, env, sweepTestUsers } from './env'

// A seat that real students will never use; the suite refuses to run if it is already taken
// so it can never touch real data, and removes only its own rows afterwards.
const SEAT = { level: 'ม.1', room: 30, student_no: 99 }
const NAME = 'ผู้ทดสอบ ระบบ'
const WORDS = [
  { word: 'แมว', reason: 'สัตว์' },
  { word: 'โรงเรียน', reason: 'สถานที่' },
  { word: 'ดินสอ', reason: 'สิ่งของ' },
  { word: 'ความสุข', reason: 'นามธรรม' },
]
const T = [true, true, true, true]
const F = [false, false, false, false]

/** Arguments of submit_worksheet: the submission plus the grade the server computed. */
const rpcArgs = (name: string, over: Partial<{ type_ok: boolean[]; reason_ok: boolean[]; words: typeof WORDS }> = {}) => ({
  p_level: SEAT.level,
  p_room: SEAT.room,
  p_student_no: SEAT.student_no,
  p_name: name,
  p_name_norm: normalizeName(name),
  p_digits: [2, 5, 7, 9],
  p_nouns: ['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง'],
  p_words: over.words ?? WORDS,
  p_type_ok: over.type_ok ?? T,
  p_reason_ok: over.reason_ok ?? T,
  p_comments: ['', '', '', ''],
  p_note: null,
})
const legacySubmission = (name: string) => ({
  ...SEAT,
  student_name: name,
  name_norm: normalizeName(name),
  digits: [2, 5, 7, 9],
  drawn_nouns: ['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง'],
  words: WORDS,
})

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
let admin: SupabaseClient
let anon: SupabaseClient
let nonTeacher: SupabaseClient
let teacher: SupabaseClient
let teacherId = ''
const createdUsers: string[] = []

async function tempUser(label: string, makeTeacher: boolean): Promise<{ client: SupabaseClient; id: string }> {
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
  return { client: c, id: data.user.id }
}

async function resetSeat() {
  await admin.from('submissions').delete().match(SEAT) // grades cascade
}
async function seatId(): Promise<string | null> {
  const { data } = await admin.from('submissions').select('id').match(SEAT).maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}
type GradeRow = { total: number; type_ok: boolean[]; reason_ok: boolean[]; graded_by: string | null }
async function gradeOf(id: string): Promise<GradeRow | null> {
  const { data } = await admin.from('grades').select('total, type_ok, reason_ok, graded_by').eq('submission_id', id).maybeSingle()
  return data as GradeRow | null
}

beforeAll(async () => {
  assertEnv()
  admin = createClient(env.url, env.serviceKey, opts)
  await sweepTestUsers(admin)
  anon = createClient(env.url, env.anonKey, opts)
  const { data } = await admin.from('submissions').select('id').match(SEAT).maybeSingle()
  if (data) throw new Error('Test seat ม.1/30/99 already exists - refusing to run (would delete data)')
  nonTeacher = (await tempUser('student', false)).client
  const t = await tempUser('teacher', true)
  teacher = t.client
  teacherId = t.id
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
    const ins = await anon.from('submissions').insert({ ...legacySubmission('x'), room: 29 })
    expect(ins.error).not.toBeNull()
    await anon.from('submissions').update({ student_name: 'hacked' }).match(SEAT)
    await anon.from('submissions').delete().match(SEAT)
    const { data } = await admin.from('submissions').select('student_name').match(SEAT).single()
    expect((data as { student_name: string }).student_name).toBe(NAME)
    expect((await anon.from('grades').insert({ submission_id: randomUUID(), type_ok: T, reason_ok: T, comments: ['', '', '', ''] })).error).not.toBeNull()
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
  it('cannot change or delete a grade or the submission', async () => {
    const id = (await seatId())!
    const before = await gradeOf(id)
    expect(before?.total).toBe(4)
    await nonTeacher.from('grades').update({ type_ok: F, reason_ok: F }).eq('submission_id', id)
    await nonTeacher.from('grades').delete().eq('submission_id', id)
    await nonTeacher.from('submissions').update({ student_name: 'hacked' }).eq('id', id)
    await nonTeacher.from('submissions').delete().eq('id', id)
    expect(await gradeOf(id)).toEqual(before)
    const { data } = await admin.from('submissions').select('student_name').eq('id', id).single()
    expect((data as { student_name: string }).student_name).toBe(NAME)
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
    expect((await teacher.from('submissions').insert({ ...legacySubmission('x'), room: 29 })).error).not.toBeNull()
    await teacher.from('submissions').update({ student_name: 'hacked' }).match(SEAT)
    const { data: after } = await admin.from('submissions').select('student_name').match(SEAT).single()
    expect((after as { student_name: string }).student_name).toBe(NAME)
  })
  it('cannot write the teachers table', async () => {
    expect((await teacher.from('teachers').insert({ user_id: randomUUID() })).error).not.toBeNull()
  })
  it('can correct an automatic grade; the total is derived in half points and a forged total is ignored', async () => {
    const id = (await seatId())!
    expect((await gradeOf(id))?.graded_by).toBeNull() // graded by the server

    const first = await teacher
      .from('grades')
      .upsert({ submission_id: id, type_ok: [true, false, false, false], reason_ok: F, comments: ['', '', '', ''], total: 4, note: 'a' })
      .select('total, graded_by')
      .single()
    expect(first.error).toBeNull()
    expect(Number((first.data as { total: number }).total)).toBe(0.5)
    expect((first.data as { graded_by: string }).graded_by).toBe(teacherId) // now it says a teacher changed it

    const second = await teacher
      .from('grades')
      .upsert({ submission_id: id, type_ok: T, reason_ok: [true, true, false, false], comments: ['', '', '', 'ลองอีก'], note: 'b' })
      .select('total')
      .single()
    expect(Number((second.data as { total: number }).total)).toBe(3)
    expect((await admin.from('grades').select('*').eq('submission_id', id)).data).toHaveLength(1)
  })
  it('requires all four of each half', async () => {
    const id = (await seatId())!
    const bad = await teacher.from('grades').upsert({ submission_id: id, type_ok: [true, true], reason_ok: T, comments: ['', '', '', ''] })
    expect(bad.error).not.toBeNull()
    const bad2 = await teacher.from('grades').upsert({ submission_id: id, type_ok: T, reason_ok: [true, null, true, true], comments: ['', '', '', ''] })
    expect(bad2.error).not.toBeNull()
  })
})

describe('submit_worksheet: submit + grade in one transaction, one attempt', () => {
  it('a new submission is stored together with its grade, graded by the server', async () => {
    await resetSeat()
    expect((await admin.rpc('submit_worksheet', rpcArgs(NAME))).data).toBe('ok')
    const g = await gradeOf((await seatId())!)
    expect(g).toMatchObject({ total: 4, type_ok: T, reason_ok: T, graded_by: null })
  })
  it('half points: type right + reason wrong on one word = 3.5', async () => {
    await resetSeat()
    await admin.rpc('submit_worksheet', rpcArgs(NAME, { reason_ok: [true, true, true, false] }))
    expect(Number((await gradeOf((await seatId())!))!.total)).toBe(3.5)
  })
  it('submitting again replaces the answers and the grade; a different name replaces the name', async () => {
    await resetSeat()
    await admin.rpc('submit_worksheet', rpcArgs(NAME))
    const id = (await seatId())!
    const changed = WORDS.map((w) => ({ ...w, reason: 'แก้ไขแล้ว' }))
    expect((await admin.rpc('submit_worksheet', rpcArgs('ชื่อใหม่ ทั้งหมด', { words: changed, type_ok: F, reason_ok: F }))).data).toBe('ok')
    expect(await seatId()).toBe(id) // same row
    const { data } = await admin.from('submissions').select('words, student_name').eq('id', id).single()
    expect((data as { words: typeof WORDS }).words[0]!.reason).toBe('แก้ไขแล้ว')
    expect((data as { student_name: string }).student_name).toBe('ชื่อใหม่ ทั้งหมด')
    expect(Number((await gradeOf(id))!.total)).toBe(0)
  })
  it('an old submission that was never graded can still be replaced, and is graded (rule 4, legacy rows)', async () => {
    await resetSeat()
    expect((await admin.from('submissions').insert(legacySubmission(NAME))).error).toBeNull()
    expect((await admin.rpc('submit_worksheet', rpcArgs(NAME, { reason_ok: F }))).data).toBe('ok')
    expect(Number((await gradeOf((await seatId())!))!.total)).toBe(2)
  })
  it('is atomic: a bad grade rolls the whole submission back', async () => {
    await resetSeat()
    const res = await admin.rpc('submit_worksheet', rpcArgs(NAME, { type_ok: [true, true] }))
    expect(res.error).not.toBeNull()
    expect(await seatId()).toBeNull() // no half-saved submission left behind
  })
  it('database CHECK constraints reject a digit above 9 and wrong lengths', async () => {
    const base = { ...legacySubmission('x'), room: 29 }
    expect((await admin.from('submissions').insert({ ...base, digits: [1, 2, 3, 10] })).error).not.toBeNull()
    expect((await admin.from('submissions').insert({ ...base, digits: [1, 2, 3] })).error).not.toBeNull()
    expect((await admin.from('submissions').insert({ ...base, drawn_nouns: ['a'] })).error).not.toBeNull()
  })
})

describe('the real handlers against the real database (grader + store)', () => {
  const guards: Guards = { rateLimit: async () => true, verifyTurnstile: async () => true }
  const scoreBody = { level: SEAT.level, room: SEAT.room, studentNo: SEAT.student_no }
  const submitBody = (words: { word: string; reason: string }[], name = NAME) => ({
    name,
    ...scoreBody,
    digits: [2, 5, 7, 9],
    words,
  })
  const perfect = [
    { word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะของบุคคล' },
    { word: 'วิสามานยนาม', reason: 'เป็นชื่อจังหวัด' },
    { word: 'ลักษณนาม', reason: 'คำว่าคันใช้นับรถ' },
    { word: 'สามานยนาม', reason: 'เป็นชื่อเรียกทั่วไป' },
  ]

  it('submit -> instant score -> a second try is re-graded -> the new score when looked up', async () => {
    const stores = createStores(env.url, env.serviceKey)
    await resetSeat()

    const missing = await handleScore({ ...scoreBody, studentNo: 98 }, guards, stores.score)
    expect(missing.body).toEqual({ status: 'not_found' })

    // two of four words answered well, the rest wrong -> graded by the real grader, stored by the real RPC
    const mixed = [perfect[0]!, perfect[1]!, { word: 'อาการนาม', reason: 'ไม่รู้' }, { word: 'อาการนาม', reason: 'มีคำว่าการนำหน้า' }]
    const first = await handleSubmit(submitBody(mixed), guards, stores.submit)
    expect(first.status).toBe(200)
    const result = (first.body as { result: { total: number; items: { points: number; comment: string | null }[] } }).result
    expect(result.total).toBe(2) // 1 + 1 + 0 + 0 (word 3: wrong type + no reason; word 4: the การ trap)
    expect(result.items.map((i) => i.points)).toEqual([1, 1, 0, 0])

    expect(result.items.every((i) => !i.comment || i.points === 1)).toBe(true) // no hints on wrong words

    const second = await handleSubmit(submitBody(perfect, 'ชื่อใหม่ ที่แก้'), guards, stores.submit) // trying again
    expect(second.status).toBe(200)
    const looked = await handleScore(scoreBody, guards, stores.score)
    expect(looked.body).toMatchObject({ status: 'graded', name: 'ชื่อใหม่ ที่แก้', total: 4 })
  })

  it('an old ungraded submission shows as waiting', async () => {
    const stores = createStores(env.url, env.serviceKey)
    await resetSeat()
    await admin.from('submissions').insert(legacySubmission(NAME))
    expect((await handleScore(scoreBody, guards, stores.score)).body).toMatchObject({ status: 'waiting', name: NAME })
  })
})
