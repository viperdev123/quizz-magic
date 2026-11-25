import { describe, expect, it } from 'vitest'
import { detectTypes, gradeWord, gradeWorksheet, MissingAnswerKeyError, normalizeForMatch, reasonHasKeywords } from '../shared/grade'

const reveal = { reveal: true }

describe('detectTypes (which noun type did the student name?)', () => {
  it('recognises the canonical names and the common alternatives', () => {
    expect([...detectTypes('สามานยนาม')]).toEqual(['common'])
    expect([...detectTypes('นามเฉพาะ')]).toEqual(['proper'])
    expect([...detectTypes('ลักษณนาม')]).toEqual(['classifier'])
    expect([...detectTypes('อาการนาม')]).toEqual(['abstract'])
    expect([...detectTypes('สมุหนาม')]).toEqual(['collective'])
  })
  it('does not mistake วิสามานยนาม for สามานยนาม (one is inside the other)', () => {
    expect([...detectTypes('วิสามานยนาม')]).toEqual(['proper'])
    expect([...detectTypes('เป็นวิสามานยนาม')]).toEqual(['proper'])
  })
  it('accepts extra words around the name, spaces and tone-mark differences', () => {
    expect([...detectTypes('  เป็น คำ ลักษณะนาม ')]).toEqual(['classifier']) // the common misspelling with an extra ะ
    expect([...detectTypes('ชนิด ลักษณ นาม')]).toEqual(['classifier']) // stray spaces are fine
    expect([...detectTypes('สามานย์นาม')]).toEqual(['common']) // thanthakhat is ignored
  })
  it('tolerates a single typo but not a vague guess', () => {
    expect([...detectTypes('วิสามนยนาม')]).toEqual(['proper']) // missing last letter
    expect([...detectTypes('นามอะไรสักอย่าง')]).toEqual([])
    expect([...detectTypes('นาม')]).toEqual([])
  })
  it('sees hedging as several types', () => {
    expect([...detectTypes('สามานยนามหรือวิสามานยนาม')].sort()).toEqual(['common', 'proper'])
  })
})

describe('reasonHasKeywords', () => {
  it('needs a rubric keyword for the expected type', () => {
    expect(reasonHasKeywords('เพราะเป็นชื่อเรียกผลไม้ทั่วไป', 'common')).toBe(true)
    expect(reasonHasKeywords('เพราะมันอร่อย', 'common')).toBe(false)
    expect(reasonHasKeywords('', 'common')).toBe(false)
  })
  it('uses per-word extra keywords', () => {
    expect(reasonHasKeywords('คำว่าเล่มบอกว่าเป็นหนังสือ', 'classifier', ['เล่ม'])).toBe(true)
    expect(reasonHasKeywords('คำว่าเล่มบอกว่าเป็นหนังสือ', 'classifier')).toBe(false)
  })
  it('never credits a negated keyword', () => {
    expect(reasonHasKeywords('เป็นชื่อเฉพาะของบุคคล', 'proper')).toBe(true)
    expect(reasonHasKeywords('เพราะไม่เจาะจง เป็นชื่อทั่วไป', 'proper')).toBe(false)
  })
  it('ignores spaces and tone marks', () => {
    expect(normalizeForMatch('เป็น ชื่อ เฉพาะ')).toBe(normalizeForMatch('เป็นชื่อเฉพาะ'))
  })
})

describe('gradeWord: 0.5 for the type + 0.5 for the reason', () => {
  it('full point when both are right', () => {
    const g = gradeWord(2, { word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะของบุคคล' }, reveal)
    expect(g).toMatchObject({ typeOk: true, reasonOk: true, points: 1 })
  })
  it('half a point for only the type', () => {
    expect(gradeWord(2, { word: 'วิสามานยนาม', reason: 'เพราะรู้จัก' }, reveal)).toMatchObject({ typeOk: true, reasonOk: false, points: 0.5 })
  })
  it('half a point for only the reason', () => {
    expect(gradeWord(2, { word: 'สามานยนาม', reason: 'เป็นชื่อเฉพาะ' }, reveal)).toMatchObject({ typeOk: false, reasonOk: true, points: 0.5 })
  })
  it('zero when neither', () => {
    expect(gradeWord(2, { word: 'อะไรก็ไม่รู้', reason: 'ไม่รู้' }, reveal).points).toBe(0)
  })
  it('hedging between types earns no type credit', () => {
    expect(gradeWord(0, { word: 'สามานยนามหรือวิสามานยนาม', reason: 'ชื่อทั่วไป' }, reveal)).toMatchObject({ typeOk: false, reasonOk: true, points: 0.5 })
  })
  it('classifier words use their own keyword (เล่ม / คัน)', () => {
    expect(gradeWord(3, { word: 'ลักษณนาม', reason: 'คำว่าเล่มเป็นตัวนับหนังสือ' }, reveal).points).toBe(1)
    expect(gradeWord(7, { word: 'ลักษณนาม', reason: 'คำว่าคันใช้กับรถ' }, reveal).points).toBe(1)
  })
  it('feedback reveals the key only when allowed', () => {
    const shown = gradeWord(1, { word: 'สามานยนาม', reason: 'x' }, { reveal: true }).feedback
    const hidden = gradeWord(1, { word: 'สามานยนาม', reason: 'x' }, { reveal: false }).feedback
    expect(shown).toContain('อาการนาม')
    expect(hidden).not.toContain('อาการนาม')
  })
  it('refuses to score a word that has no answer key yet', () => {
    expect(() => gradeWord(9, { word: 'สามานยนาม', reason: 'ทั่วไป' }, reveal)).toThrow(MissingAnswerKeyError)
  })
})

describe('gradeWorksheet', () => {
  const good = [
    { word: 'สามานยนาม', reason: 'เป็นชื่อเรียกทั่วไป' }, // 0 มะนาว
    { word: 'อาการนาม', reason: 'มีคำว่าความนำหน้า' }, // 1 ความรัก
    { word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะของบุคคล' }, // 2 สุนทรภู่
    { word: 'ลักษณนาม', reason: 'เล่มใช้นับหนังสือ' }, // 3
  ]
  it('totals 4 for a perfect worksheet', () => {
    expect(gradeWorksheet([0, 1, 2, 3], good, reveal).total).toBe(4)
  })
  it('totals in half-point steps', () => {
    const mixed = [good[0]!, { word: 'อาการนาม', reason: 'ไม่รู้' }, { word: 'สามานยนาม', reason: 'ชื่อเฉพาะ' }, { word: '', reason: '' }]
    expect(gradeWorksheet([0, 1, 2, 3], mixed, reveal).total).toBe(2) // 1 + 0.5 + 0.5 + 0
  })
})

describe('a typo must never flip the meaning', () => {
  it('does not read "เจาะจง" (specific) as "ไม่เจาะจง" (not specific)', () => {
    expect([...detectTypes('เจาะจง')]).not.toContain('common')
    expect([...detectTypes('ไม่เจาะจง')]).toEqual(['common'])
    expect(gradeWord(4, { word: 'นามเฉพาะ', reason: 'เจาะจง' }, reveal).points).toBe(0)
  })
  it('does not forgive typos inside long free text (only the short type box)', () => {
    expect([...detectTypes('ขอบคุณครับ '.repeat(12) + 'วิสามนยนาม')]).toEqual([]) // long text: no typo-forgiveness
    expect([...detectTypes('วิสามนยนาม')]).toEqual(['proper']) // the same slip in the short type box is forgiven
  })
})
