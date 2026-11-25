import { describe, expect, it } from 'vitest'
import { normalizeName } from '@shared/normalize'
import { ScoreReqSchema, SubmitReqSchema } from '@shared/schemas'

const validSubmit = {
  name: 'พิมพ์ชนก ใจดี',
  level: 'ม.1',
  room: 2,
  studentNo: 12,
  digits: [2, 5, 7, 9],
  drawnNouns: ['แมว', 'โรงเรียน', 'ดินสอ', 'ความสุข'],
  words: [
    { word: 'แมว', reason: 'ใช้เรียกชื่อสัตว์' },
    { word: 'โรงเรียน', reason: 'ใช้เรียกชื่อสถานที่' },
    { word: 'ดินสอ', reason: 'ใช้เรียกชื่อสิ่งของ' },
    { word: 'วิ่ง', reason: 'เป็นการกระทำของคน' },
  ],
  turnstileToken: 't',
}

describe('normalizeName', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(normalizeName('  Somchai   JAIDEE ')).toBe('somchai jaidee')
  })
  it('handles mixed Thai/Latin and zero-width characters', () => {
    expect(normalizeName('สม​ชาย  Smith')).toBe('สมชาย smith')
  })
  it('is NFC-stable', () => {
    expect(normalizeName('é')).toBe(normalizeName('é'))
  })
})

describe('schemas', () => {
  it('accepts a valid submission', () => {
    expect(SubmitReqSchema.safeParse(validSubmit).success).toBe(true)
  })
  it('rejects a digit above 9 and wrong array lengths', () => {
    expect(SubmitReqSchema.safeParse({ ...validSubmit, digits: [2, 5, 7, 10] }).success).toBe(false)
    expect(SubmitReqSchema.safeParse({ ...validSubmit, digits: [2, 5, 7] }).success).toBe(false)
  })
  it('rejects unknown level and out-of-range seat', () => {
    expect(SubmitReqSchema.safeParse({ ...validSubmit, level: 'ม.7' }).success).toBe(false)
    expect(SubmitReqSchema.safeParse({ ...validSubmit, room: 0 }).success).toBe(false)
  })
  it('score lookup needs no name', () => {
    expect(ScoreReqSchema.safeParse({ level: 'ม.1', room: 2, studentNo: 12, turnstileToken: 't' }).success).toBe(true)
  })
})
