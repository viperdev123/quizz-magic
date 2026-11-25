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
  digits: z.tuple([digit, digit, digit, digit]),
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

export type SubmitRes = { ok: true } | { ok: false; code: ApiErrorCode; message: string }

export interface ScoreItem {
  digit: number
  drawnNoun: string
  word: string
  reason: string
  correct: boolean
  comment: string | null
}
export type ScoreRes =
  | { status: 'not_found' }
  | { status: 'waiting'; name: string; level: string; room: number; studentNo: number; submittedAt: string }
  | {
      status: 'graded'
      name: string
      level: string
      room: number
      studentNo: number
      submittedAt: string
      total: number
      note: string | null
      items: [ScoreItem, ScoreItem, ScoreItem, ScoreItem]
    }
export type ScoreErrorRes = { ok: false; code: ApiErrorCode; message: string }
