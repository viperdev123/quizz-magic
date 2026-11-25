import { describe, expect, it, vi } from 'vitest'
import {
  handleScore,
  handleSubmit,
  type Guards,
  type ScoreStore,
  type StoredSubmission,
} from '../functions/_lib/handlers'
import { checkRateLimit, type KvLike } from '../functions/_lib/ratelimit'
import { verifyTurnstile } from '../functions/_lib/turnstile'
import { MESSAGES } from '../shared/constants'

const okGuards: Guards = { rateLimit: async () => true, verifyTurnstile: async () => true }

const perfectWords = [
  { word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะของบุคคล' }, // 2 สุนทรภู่
  { word: 'วิสามานยนาม', reason: 'เป็นชื่อจังหวัด' }, // 5 เชียงใหม่
  { word: 'ลักษณนาม', reason: 'คำว่าคันใช้นับรถ' }, // 7 รถคันที่สาม
  { word: 'สามานยนาม', reason: 'เป็นชื่อเรียกทั่วไป' }, // 9 อกร่อง
]
const submitBody = {
  name: '  พิมพ์ชนก   ใจดี ',
  level: 'ม.1',
  room: 2,
  studentNo: 12,
  digits: [2, 5, 7, 9],
  drawnNouns: ['แมว', 'โรงเรียน', 'ดินสอ', 'ความสุข'],
  words: perfectWords,
  turnstileToken: 'tok',
}

describe('POST /api/submit', () => {
  it('stores a valid submission with a normalised name (rule 1)', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    const res = await handleSubmit(submitBody, okGuards, { submit })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(submit.mock.calls[0]![0]).toMatchObject({
      level: 'ม.1',
      room: 2,
      studentNo: 12,
      nameNorm: 'พิมพ์ชนก ใจดี',
    })
  })

  it('grades on the server and returns the score straight away (0.5 type + 0.5 reason per word)', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    const res = await handleSubmit(submitBody, okGuards, { submit })
    const result = (res.body as { result: { status: string; total: number; items: { points: number; typeOk: boolean; reasonOk: boolean; drawnNoun: string }[] } }).result
    expect(result.status).toBe('graded')
    expect(result.total).toBe(4)
    expect(result.items.map((i) => i.points)).toEqual([1, 1, 1, 1])
    expect(result.items.map((i) => i.drawnNoun)).toEqual(['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง'])
    // the same grade is what gets stored
    expect(submit.mock.calls[0]![0]).toMatchObject({ typeOk: [true, true, true, true], reasonOk: [true, true, true, true] })
  })

  it('gives partial credit in half points', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    const words = [
      { word: 'วิสามานยนาม', reason: 'เพราะรู้จัก' }, // type only: 0.5
      { word: 'สามานยนาม', reason: 'เป็นชื่อจังหวัด' }, // reason only: 0.5
      { word: 'ลักษณนาม', reason: 'คำว่าคันใช้นับรถ' }, // 1
      { word: 'อาการนาม', reason: 'มีคำว่าการนำหน้า' }, // the trap for อกร่อง: 0
    ]
    const res = await handleSubmit({ ...submitBody, words }, okGuards, { submit })
    expect((res.body as { result: { total: number } }).result.total).toBe(2)
    expect(submit.mock.calls[0]![0]).toMatchObject({
      typeOk: [true, false, true, false],
      reasonOk: [false, true, true, false],
    })
  })

  it('stores a feedback comment for every word', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    await handleSubmit({ ...submitBody, words: [...perfectWords.slice(0, 3), { word: 'ไม่รู้', reason: 'ไม่รู้' }] }, okGuards, { submit })
    const { comments } = submit.mock.calls[0]![0] as { comments: string[] }
    expect(comments).toHaveLength(4)
    expect(comments[0]).toContain('ถูกต้อง')
    expect(comments[3]).toBe('') // no hint and no answer key for a wrong word (students may try again)
  })

  it('ignores a score or marks sent by the client', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    const words = Array(4).fill({ word: 'ไม่รู้', reason: 'ไม่รู้' })
    const res = await handleSubmit({ ...submitBody, words, total: 4, typeOk: [true, true, true, true], marks: [true, true, true, true] }, okGuards, { submit })
    expect((res.body as { result: { total: number } }).result.total).toBe(0)
  })

  it('stores the fixed word for each digit and ignores any noun text sent by the client', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    await handleSubmit({ ...submitBody, digits: [3, 7, 0, 9], drawnNouns: ['<script>', 'x', 'y', 'z'] }, okGuards, { submit })
    expect(submit.mock.calls[0]![0].drawnNouns).toEqual(['หนังสือ ๑ เล่ม', 'รถคันที่สาม', 'มะนาว', 'อกร่อง'])
  })

  it('does not require the client to send nouns at all', async () => {
    const { drawnNouns: _omit, ...withoutNouns } = submitBody
    void _omit
    const res = await handleSubmit(withoutNouns, okGuards, { submit: vi.fn().mockResolvedValue('ok') })
    expect(res.status).toBe(200)
  })

  it('does not send a hint or the answer key for a wrong word, but keeps praise for a right one', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    const res = await handleSubmit(submitBody, okGuards, { submit })
    const sent = submit.mock.calls[0]![0] as { comments: string[]; typeOk: boolean[]; reasonOk: boolean[] }
    sent.comments.forEach((c, i) => {
      if (sent.typeOk[i] && sent.reasonOk[i]) expect(c).toBeTruthy()
      else expect(c).toBe('')
    })
    expect(JSON.stringify(res.body)).not.toContain('ชนิดที่ถูกคือ')
  })

  it('rejects invalid input before touching Turnstile or the DB', async () => {
    const verify = vi.fn().mockResolvedValue(true)
    const submit = vi.fn()
    const res = await handleSubmit({ ...submitBody, digits: [1, 2, 3, 10] }, { ...okGuards, verifyTurnstile: verify }, { submit })
    expect(res.status).toBe(400)
    expect(verify).not.toHaveBeenCalled()
    expect(submit).not.toHaveBeenCalled()
  })

  it('rejects when Turnstile fails', async () => {
    const submit = vi.fn()
    const res = await handleSubmit(submitBody, { ...okGuards, verifyTurnstile: async () => false }, { submit })
    expect(res.body).toMatchObject({ ok: false, code: 'TURNSTILE' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited, before anything else', async () => {
    const verify = vi.fn()
    const res = await handleSubmit(submitBody, { rateLimit: async () => false, verifyTurnstile: verify }, { submit: vi.fn() })
    expect(res.status).toBe(429)
    expect(verify).not.toHaveBeenCalled()
  })

  it('returns a generic error when the DB throws', async () => {
    const res = await handleSubmit(submitBody, okGuards, {
      submit: async () => {
        throw new Error('secret db detail')
      },
    })
    expect(res.status).toBe(500)
    expect(JSON.stringify(res.body)).not.toContain('secret db detail')
  })
})

const base: StoredSubmission = {
  student_name: 'พิมพ์ชนก ใจดี',
  level: 'ม.1',
  room: 2,
  student_no: 12,
  submitted_at: '2026-11-25T02:42:00Z',
  digits: [2, 5, 7, 9],
  drawn_nouns: ['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง'],
  words: perfectWords,
  grade: null,
}
const scoreBody = { level: 'ม.1', room: 2, studentNo: 12, turnstileToken: 't' }
const storeOf = (row: StoredSubmission | null): ScoreStore => ({ find: async () => row })

describe('POST /api/score', () => {
  it('returns not_found for a missing submission (rule 5)', async () => {
    const res = await handleScore(scoreBody, okGuards, storeOf(null))
    expect(res.body).toEqual({ status: 'not_found' })
  })

  it('needs no name in the request', async () => {
    const res = await handleScore(scoreBody, okGuards, storeOf(base))
    expect(res.status).toBe(200)
  })

  it('returns waiting for an old submission that was never graded, without answers or marks', async () => {
    const res = await handleScore(scoreBody, okGuards, storeOf(base))
    expect(res.body).toMatchObject({ status: 'waiting', name: 'พิมพ์ชนก ใจดี' })
    expect(res.body).not.toHaveProperty('items')
  })

  it('returns graded details: total, per-word points for each half, comments and note (rule 6)', async () => {
    const graded: StoredSubmission = {
      ...base,
      grade: {
        type_ok: [true, true, true, false],
        reason_ok: [true, true, false, false],
        comments: ['', '', null, 'ลองอีกนิดนะ'],
        note: 'เก่งมาก',
        total: 2.5,
      },
    }
    const res = await handleScore(scoreBody, okGuards, storeOf(graded))
    expect(res.body).toMatchObject({ status: 'graded', total: 2.5, note: 'เก่งมาก' })
    const items = (res.body as { items: unknown[] }).items
    expect(items).toHaveLength(4)
    expect(items[3]).toEqual({
      digit: 9, drawnNoun: 'อกร่อง', word: 'สามานยนาม', reason: 'เป็นชื่อเรียกทั่วไป',
      typeOk: false, reasonOk: false, points: 0, comment: 'ลองอีกนิดนะ',
    })
    expect(items[2]).toMatchObject({ typeOk: true, reasonOk: false, points: 0.5, comment: null })
    expect(items[0]).toMatchObject({ typeOk: true, reasonOk: true, points: 1 })
  })

  it('shows the same result when looked up later as it did right after submitting', async () => {
    const submit = vi.fn().mockResolvedValue('ok')
    const submitted = await handleSubmit(submitBody, okGuards, { submit })
    const args = submit.mock.calls[0]![0] as { typeOk: boolean[]; reasonOk: boolean[]; comments: string[] }
    const stored: StoredSubmission = {
      ...base,
      grade: { type_ok: args.typeOk, reason_ok: args.reasonOk, comments: args.comments, note: null, total: 4 },
    }
    const later = await handleScore(scoreBody, okGuards, storeOf(stored))
    const a = (submitted.body as { result: { items: unknown; total: number } }).result
    const b = later.body as { items: unknown; total: number }
    expect(b.total).toBe(a.total)
    expect(b.items).toEqual(a.items)
  })

  it('exposes only the allowed fields (no ids, no name_norm)', async () => {
    const graded: StoredSubmission = {
      ...base,
      grade: { type_ok: [true, true, true, true], reason_ok: [true, true, true, true], comments: ['', '', '', ''], note: null, total: 4 },
    }
    const res = await handleScore(scoreBody, okGuards, storeOf({ ...graded, id: 'x', name_norm: 'y' } as StoredSubmission))
    const keys = Object.keys(res.body).sort()
    expect(keys).toEqual(['items', 'level', 'name', 'note', 'room', 'status', 'studentNo', 'submittedAt', 'total'])
  })

  it('validates input and Turnstile', async () => {
    expect((await handleScore({ ...scoreBody, room: 99 }, okGuards, storeOf(base))).status).toBe(400)
    const res = await handleScore(scoreBody, { ...okGuards, verifyTurnstile: async () => false }, storeOf(base))
    expect(res.body).toMatchObject({ code: 'TURNSTILE' })
  })
})

describe('checkRateLimit', () => {
  const memoryKv = (): KvLike & { data: Map<string, string> } => {
    const data = new Map<string, string>()
    return { data, get: async (k) => data.get(k) ?? null, put: async (k, v) => void data.set(k, v) }
  }

  it('allows up to the limit, then blocks, per IP', async () => {
    const kv = memoryKv()
    const now = 1_000_000
    for (let i = 0; i < 5; i++) expect(await checkRateLimit(kv, 'score', '1.2.3.4', 5, 60, now)).toBe(true)
    expect(await checkRateLimit(kv, 'score', '1.2.3.4', 5, 60, now)).toBe(false)
    expect(await checkRateLimit(kv, 'score', '5.6.7.8', 5, 60, now)).toBe(true)
  })

  it('resets in the next window and never stores the raw IP', async () => {
    const kv = memoryKv()
    for (let i = 0; i < 5; i++) await checkRateLimit(kv, 'score', '1.2.3.4', 5, 60, 0)
    expect(await checkRateLimit(kv, 'score', '1.2.3.4', 5, 60, 61_000)).toBe(true)
    expect([...kv.data.keys()].some((k) => k.includes('1.2.3.4'))).toBe(false)
  })

  it('fails open when KV is down', async () => {
    const broken: KvLike = {
      get: async () => {
        throw new Error('down')
      },
      put: async () => undefined,
    }
    expect(await checkRateLimit(broken, 'submit', 'ip', 1, 60)).toBe(true)
  })
})

describe('verifyTurnstile', () => {
  const fakeFetch = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch
  it('accepts only success:true', async () => {
    expect(await verifyTurnstile('t', 's', null, fakeFetch({ success: true }))).toBe(true)
    expect(await verifyTurnstile('t', 's', null, fakeFetch({ success: false }))).toBe(false)
    expect(await verifyTurnstile('t', 's', null, fakeFetch({}, false))).toBe(false)
  })
  it('fails closed on network errors', async () => {
    const boom = (async () => {
      throw new Error('net')
    }) as unknown as typeof fetch
    expect(await verifyTurnstile('t', 's', null, boom)).toBe(false)
  })
})

describe('serve() never leaks platform errors', () => {
  it('returns a generic Thai JSON 500 when configuration is missing (e.g. secrets not set)', async () => {
    const { serve } = await import('../functions/_lib/serve')
    const kv = { get: async () => null, put: async () => undefined }
    const res = await serve(
      new Request('https://example.test/api/score', { method: 'POST', body: JSON.stringify({ level: 'ม.1', room: 1, studentNo: 1, turnstileToken: 't' }) }),
      { RATE_LIMIT: kv, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', TURNSTILE_SECRET_KEY: '' } as never,
      'score',
    )
    expect(res.status).toBe(500)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ ok: false, code: 'ERROR', message: MESSAGES.error })
  })
})

describe('Turnstile is optional', () => {
  const { turnstileToken: _t, ...bodyNoToken } = submitBody
  void _t
  const scoreNoToken = { level: 'ม.1', room: 2, studentNo: 12 }

  it('accepts a submit and a score lookup without any token when verification is off', async () => {
    const off: Guards = { rateLimit: async () => true, verifyTurnstile: async () => true }
    expect((await handleSubmit(bodyNoToken, off, { submit: vi.fn().mockResolvedValue('ok') })).status).toBe(200)
    expect((await handleScore(scoreNoToken, off, { find: async () => null })).body).toEqual({ status: 'not_found' })
  })

  it('still rejects a missing token when verification is on (the guard receives an empty token)', async () => {
    const seen: string[] = []
    const on: Guards = { rateLimit: async () => true, verifyTurnstile: async (t) => (seen.push(t), t !== '') }
    const res = await handleSubmit(bodyNoToken, on, { submit: vi.fn() })
    expect(res.body).toMatchObject({ ok: false, code: 'TURNSTILE' })
    expect(seen).toEqual([''])
  })
})
