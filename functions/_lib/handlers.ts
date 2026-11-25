// Pure request handlers: no Cloudflare globals, all I/O injected, so they are unit-testable.
// NEVER log request bodies or results here (student data).
import { MESSAGES } from '../../shared/constants'
import { drawnNounFor } from '../../shared/drawn'
import { gradeWorksheet } from '../../shared/grade'
import { normalizeName } from '../../shared/normalize'
import {
  ScoreReqSchema,
  SubmitReqSchema,
  type ApiErrorCode,
  type GradedScore,
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
  /** Stores the submission AND its grade in one transaction. */
  submit(args: {
    level: string
    room: number
    studentNo: number
    name: string
    nameNorm: string
    digits: number[]
    drawnNouns: string[]
    words: { word: string; reason: string }[]
    typeOk: boolean[]
    reasonOk: boolean[]
    comments: string[]
    note: string | null
  }): Promise<SubmitOutcome>
}

export interface StoredGrade {
  type_ok: boolean[]
  reason_ok: boolean[]
  comments: (string | null)[]
  note: string | null
  total: number
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
  grade: StoredGrade | null
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

type Four<T> = [T, T, T, T]

/** What the student sees: shared by "just submitted" and "looked it up later". */
function toGradedScore(row: StoredSubmission, g: StoredGrade): GradedScore | null {
  const items = row.words.map(
    (w, i): ScoreItem => {
      const typeOk = g.type_ok[i] === true
      const reasonOk = g.reason_ok[i] === true
      return {
        digit: row.digits[i] ?? 0,
        drawnNoun: row.drawn_nouns[i] ?? '',
        word: w.word,
        reason: w.reason,
        typeOk,
        reasonOk,
        points: (typeOk ? 0.5 : 0) + (reasonOk ? 0.5 : 0),
        comment: g.comments[i] ? g.comments[i] : null,
      }
    },
  )
  if (items.length !== 4) return null
  return {
    status: 'graded',
    name: row.student_name,
    level: row.level,
    room: row.room,
    studentNo: row.student_no,
    submittedAt: row.submitted_at,
    total: Number(g.total),
    note: g.note ? g.note : null,
    items: items as Four<ScoreItem>,
  }
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
    // Grade on the server (the client is never trusted with the score).
    const graded = gradeWorksheet(req.digits, req.words, { reveal: true })
    // never trust client text: the stored noun is always the one tied to the digit
    const drawnNouns = req.digits.map((d) => drawnNounFor(d))
    const typeOk = graded.items.map((i) => i.typeOk)
    const reasonOk = graded.items.map((i) => i.reasonOk)
    const comments = graded.items.map((i) => i.feedback)

    const outcome = await store.submit({
      level: req.level,
      room: req.room,
      studentNo: req.studentNo,
      name: req.name,
      nameNorm: normalizeName(req.name),
      digits: req.digits,
      drawnNouns,
      words: req.words,
      typeOk,
      reasonOk,
      comments,
      note: null,
    })
    if (outcome === 'locked') return fail('LOCKED')
    if (outcome === 'mismatch') return fail('MISMATCH')

    const result = toGradedScore(
      {
        student_name: req.name,
        level: req.level,
        room: req.room,
        student_no: req.studentNo,
        submitted_at: new Date().toISOString(),
        digits: req.digits,
        drawn_nouns: drawnNouns,
        words: req.words,
        grade: null,
      },
      { type_ok: typeOk, reason_ok: reasonOk, comments, note: null, total: graded.total },
    )
    if (!result) return fail('ERROR')
    return { status: 200, body: { ok: true, result } }
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

  if (!row.grade) {
    // only an old submission from before auto-grading can be ungraded
    return {
      status: 200,
      body: {
        status: 'waiting',
        name: row.student_name,
        level: row.level,
        room: row.room,
        studentNo: row.student_no,
        submittedAt: row.submitted_at,
      },
    }
  }
  const result = toGradedScore(row, row.grade)
  return result ? { status: 200, body: result } : fail('ERROR')
}
