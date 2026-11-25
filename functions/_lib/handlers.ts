// Pure request handlers: no Cloudflare globals, all I/O injected, so they are unit-testable.
// NEVER log request bodies or results here (student data).
import { MESSAGES } from '../../shared/constants'
import { drawnNounFor } from '../../shared/drawn'
import { normalizeName } from '../../shared/normalize'
import {
  ScoreReqSchema,
  SubmitReqSchema,
  type ApiErrorCode,
  type ScoreErrorRes,
  type ScoreItem,
  type ScoreRes,
  type SubmitRes,
} from '../../shared/schemas'

export interface Guards {
  /** true = allowed */
  rateLimit(route: 'submit' | 'score', limit: number, windowSec: number): Promise<boolean>
  verifyTurnstile(token: string): Promise<boolean>
}

export type SubmitOutcome = 'ok' | 'locked' | 'mismatch'
export interface SubmitStore {
  submit(args: {
    level: string
    room: number
    studentNo: number
    name: string
    nameNorm: string
    digits: number[]
    drawnNouns: string[]
    words: { word: string; reason: string }[]
  }): Promise<SubmitOutcome>
}

export interface StoredSubmission {
  student_name: string
  level: string
  room: number
  student_no: number
  submitted_at: string
  digits: number[]
  drawn_nouns: string[]
  words: { word: string; reason: string }[]
  grade: { marks: boolean[]; comments: (string | null)[]; note: string | null; total: number } | null
}
export interface ScoreStore {
  find(level: string, room: number, studentNo: number): Promise<StoredSubmission | null>
}

export const LIMITS_PER_ROUTE = {
  // A whole class often shares one school IP, so these are generous (demo, Turnstile off).
  submit: { limit: 60, windowSec: 600 },
  score: { limit: 30, windowSec: 60 },
} as const

const STATUS: Record<ApiErrorCode, number> = {
  INVALID: 400,
  TURNSTILE: 400,
  RATE_LIMITED: 429,
  LOCKED: 409,
  MISMATCH: 409,
  ERROR: 500,
}
const TEXT: Record<ApiErrorCode, string> = {
  INVALID: MESSAGES.invalid,
  TURNSTILE: MESSAGES.turnstile,
  RATE_LIMITED: MESSAGES.rateLimited,
  LOCKED: MESSAGES.locked,
  MISMATCH: MESSAGES.mismatch,
  ERROR: MESSAGES.error,
}

function fail(code: ApiErrorCode): { status: number; body: ScoreErrorRes } {
  return { status: STATUS[code], body: { ok: false, code, message: TEXT[code] } }
}

export async function handleSubmit(
  body: unknown,
  guards: Guards,
  store: SubmitStore,
): Promise<{ status: number; body: SubmitRes }> {
  const rl = LIMITS_PER_ROUTE.submit
  if (!(await guards.rateLimit('submit', rl.limit, rl.windowSec))) return fail('RATE_LIMITED')

  const parsed = SubmitReqSchema.safeParse(body)
  if (!parsed.success) return fail('INVALID')
  const req = parsed.data

  if (!(await guards.verifyTurnstile(req.turnstileToken ?? ''))) return fail('TURNSTILE')

  try {
    const outcome = await store.submit({
      level: req.level,
      room: req.room,
      studentNo: req.studentNo,
      name: req.name,
      nameNorm: normalizeName(req.name),
      digits: req.digits,
      // never trust client text: the stored noun is always the one tied to the digit
      drawnNouns: req.digits.map((d) => drawnNounFor(d)),
      words: req.words,
    })
    if (outcome === 'locked') return fail('LOCKED')
    if (outcome === 'mismatch') return fail('MISMATCH')
    return { status: 200, body: { ok: true } }
  } catch {
    return fail('ERROR')
  }
}

export async function handleScore(
  body: unknown,
  guards: Guards,
  store: ScoreStore,
): Promise<{ status: number; body: ScoreRes | ScoreErrorRes }> {
  const rl = LIMITS_PER_ROUTE.score
  if (!(await guards.rateLimit('score', rl.limit, rl.windowSec))) return fail('RATE_LIMITED')

  const parsed = ScoreReqSchema.safeParse(body)
  if (!parsed.success) return fail('INVALID')
  const req = parsed.data

  if (!(await guards.verifyTurnstile(req.turnstileToken ?? ''))) return fail('TURNSTILE')

  let row: StoredSubmission | null
  try {
    row = await store.find(req.level, req.room, req.studentNo)
  } catch {
    return fail('ERROR')
  }
  if (!row) return { status: 200, body: { status: 'not_found' } }

  const who = {
    name: row.student_name,
    level: row.level,
    room: row.room,
    studentNo: row.student_no,
    submittedAt: row.submitted_at,
  }
  if (!row.grade) return { status: 200, body: { status: 'waiting', ...who } }

  const g = row.grade
  const items = row.words.map(
    (w, i): ScoreItem => ({
      digit: row.digits[i] ?? 0,
      drawnNoun: row.drawn_nouns[i] ?? '',
      word: w.word,
      reason: w.reason,
      correct: g.marks[i] === true,
      comment: g.comments[i] ? g.comments[i] : null,
    }),
  ) as ScoreItem[]
  if (items.length !== 4) return fail('ERROR')

  return {
    status: 200,
    body: {
      status: 'graded',
      ...who,
      total: g.total,
      note: g.note ? g.note : null,
      items: items as [ScoreItem, ScoreItem, ScoreItem, ScoreItem],
    },
  }
}
