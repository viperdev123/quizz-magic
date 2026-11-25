import { z } from 'zod'
import { LEVELS, LIMITS } from './constants'

export const LevelSchema = z.enum(LEVELS)
const room = z.number().int().min(LIMITS.room.min).max(LIMITS.room.max)
const studentNo = z.number().int().min(LIMITS.studentNo.min).max(LIMITS.studentNo.max)
const digit = z.number().int().min(0).max(9)
const noun = z.string().trim().min(1).max(LIMITS.noun)
const wordItem = z.object({
  word: z.string().trim().min(1).max(LIMITS.word),
  reason: z.string().trim().min(1).max(LIMITS.reason),
})

export const SubmitReqSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.name),
  level: LevelSchema,
  room,
  studentNo,
  digits: z
    .tuple([digit, digit, digit, digit])
    .refine((d) => new Set(d).size === 4, 'digits must be different'),
  /** Deprecated: ignored. The server derives the noun from each digit (shared/drawn.ts). */
  drawnNouns: z.tuple([noun, noun, noun, noun]).optional(),
  words: z.tuple([wordItem, wordItem, wordItem, wordItem]),
  turnstileToken: z.string().min(1).optional(),
})
export type SubmitReq = z.infer<typeof SubmitReqSchema>

/** Score lookup uses level + room + number only (no name) — decision recorded in README privacy notes. */
export const ScoreReqSchema = z.object({
  level: LevelSchema,
  room,
  studentNo,
  turnstileToken: z.string().min(1).optional(),
})
export type ScoreReq = z.infer<typeof ScoreReqSchema>

export type ApiErrorCode = 'INVALID' | 'LOCKED' | 'MISMATCH' | 'TURNSTILE' | 'RATE_LIMITED' | 'ERROR'

/** One word's result. points = 0.5 (typeOk) + 0.5 (reasonOk). */
export interface ScoreItem {
  digit: number
  drawnNoun: string
  word: string
  reason: string
  typeOk: boolean
  reasonOk: boolean
  points: number // 0, 0.5 or 1
  comment: string | null
}
export interface GradedScore {
  status: 'graded'
  name: string
  level: string
  room: number
  studentNo: number
  submittedAt: string
  total: number // 0 - 4, in steps of 0.5
  note: string | null
  items: [ScoreItem, ScoreItem, ScoreItem, ScoreItem]
}
export type ScoreRes =
  | { status: 'not_found' }
  | { status: 'waiting'; name: string; level: string; room: number; studentNo: number; submittedAt: string }
  | GradedScore
export type ScoreErrorRes = { ok: false; code: ApiErrorCode; message: string }

/** Submitting grades the work on the spot, so the answer carries the score. */
export type SubmitRes = { ok: true; result: GradedScore } | { ok: false; code: ApiErrorCode; message: string }
