import { describe, expect, it } from 'vitest'
import { gradeWord, gradeWorksheet, MissingAnswerKeyError } from '../shared/grade'

// A corpus of realistic Grade-7 answers. Each row: digit, what was typed in "ชนิดคำนาม", what was typed in
// "เพราะ...", and the points it SHOULD earn (0.5 for the type + 0.5 for the reason). The expectations were
// decided from the grammar, not from the engine's output.
type Row = [digit: number, word: string, reason: string, points: number, why: string]

const SUITES: Record<string, Row[]> = {
  '0 มะนาว (สามานยนาม)': [
    [0, 'สามานยนาม', 'เป็นชื่อเรียกผลไม้ทั่วไป', 1, 'textbook answer'],
    [0, 'นามทั่วไป', 'ไม่ได้เจาะจงว่ามะนาวลูกไหน', 1, 'everyday name + "not specific" in own words'],
    [0, 'สามานยนาม', 'เพราะมันเป็นผลไม้', 1, 'reason by category'],
    [0, 'ชื่อทั่วไป', 'ไม่ใช่ชื่อเฉพาะ', 1, '"not a proper name" is a correct reason'],
    [0, 'common noun', 'เรียกได้ทุกอย่างที่เป็นผลไม้', 1, 'English type name'],
    [0, 'สามานยนาม ไม่เจาะจง', '', 1, 'type and reason together in the first box'],
    [0, '', 'สามานยนาม เพราะเป็นชื่อเรียกผลไม้ทั่วไป', 1, 'everything in the second box'],
    [0, '  สามานยนาม!!!  ', 'เป็นชื่อเรียก ผลไม้ ทั่วๆไป 🍋', 1, 'punctuation, emoji, ๆ, extra spaces'],
    [0, 'สามานยนามมมม', 'ทั่วไปปปป', 1, 'stretched letters'],
    [0, 'สามาน นาม', 'ทั่วไป', 1, 'a missing letter and a stray space'],
    [0, 'สามารถนาม', 'ทั่วไป', 1, 'misspelt as สามารถ (2 letters off)'],
    [0, 'สามานย์นาม', 'ทั่วไป', 1, 'thanthakhat added'],
    [0, 'วิสามานยนาม', 'เป็นชื่อเฉพาะ', 0, 'wrong type and a reason for the wrong type'],
    [0, 'สามานยนาม', 'เพราะอร่อย', 0.5, 'right type, reason says nothing about nouns'],
    [0, 'สามานยนาม', '', 0.5, 'no reason'],
    [0, '', 'เป็นผลไม้ทั่วไป', 1, 'only a reason, but it clearly says "general"'],
    [0, 'สามานยนาม', 'เป็นชื่อเฉพาะ', 0.5, 'right type but the reason contradicts it'],
    [0, 'สามานยนามหรือวิสามานยนาม', 'ทั่วไป', 0.5, 'hedging between two types is not a type answer'],
    [0, 'สามานยนาม', 'มะนาว', 0.5, 'restating the word is not a reason'],
    [0, 'สามานยนาม', 'เพราะมันคือมะนาว', 0.5, 'restating the word, with filler'],
    [0, 'ไม่ใช่สามานยนาม', 'ทั่วไป', 0.5, 'negated type name is not an answer'],
    [0, 'อะไรก็ไม่รู้', 'ไม่รู้ครับ', 0, 'no idea'],
    [0, '', '', 0, 'blank'],
  ],

  '1 ความรัก (อาการนาม)': [
    [1, 'อาการนาม', 'มีคำว่าความนำหน้า', 1, 'the ความ clue'],
    [1, 'อาการนาม', 'มาจากคำกริยาว่ารัก', 1, 'comes from a verb'],
    [1, 'อาการนาม', 'เกิดจากคำกริยา', 1, 'derived from a verb'],
    [1, 'นามธรรม', 'จับต้องไม่ได้ เป็นความรู้สึก', 1, 'abstract: another accepted name, intangible'],
    [1, 'อาการ', 'ขึ้นต้นด้วยความ', 1, 'short type name'],
    [1, 'อาการนาม', 'ความ', 1, 'one word, but the right one'],
    [1, 'อาการนาม', 'ไม่ใช่สิ่งของ จับต้องไม่ได้', 1, '"not a physical thing"'],
    [1, 'อาการนาม', 'เพราะความรักคือรัก', 0.5, 'circular: only repeats the word'],
    [1, 'อาการนาม', 'เพราะเป็นอาการนาม', 0.5, 'circular: อาการ inside the type name must not count'],
    [1, 'อาการนาม', 'ไม่รู้', 0.5, '"I do not know" is not a reason'],
    [1, 'อาการนาม', 'เป็นชื่อเรียกทั่วไป', 0.5, 'right type, reason for another type'],
    [1, 'สามานยนาม', 'มีคำว่าความอยู่ข้างหน้า', 0.5, 'wrong type, good reason'],
    [1, 'ไม่ใช่อาการนาม', 'ความ', 0.5, 'negated type name'],
    [1, 'อาการนาม', 'การ ความ ทั่วไป เฉพาะ ลักษณะ นับ กลุ่ม', 0.5, 'keyword stuffing across many types'],
    [1, 'วิสามานยนาม', 'เป็นชื่อเฉพาะ', 0, 'wrong on both'],
  ],

  '2 สุนทรภู่ (วิสามานยนาม)': [
    [2, 'วิสามานยนาม', 'เป็นชื่อเฉพาะของบุคคล', 1, 'textbook answer'],
    [2, 'นามเฉพาะ', 'เป็นชื่อกวีเอก ไม่ซ้ำใคร', 1, 'everyday name; reason by who he is + unique'],
    [2, 'วิสามานยนาม', 'เป็นชื่อคน', 1, 'short reason'],
    [2, 'วิสามัญนาม', 'เป็นนามเฉพาะ', 1, 'alternative spelling'],
    [2, 'proper noun', 'เจาะจงว่าเป็นสุนทรภู่คนเดียว', 1, 'English; specific + one person'],
    [2, 'วิสามานยนาม', 'มีคนเดียวในโลก', 1, 'unique'],
    [2, 'วิสามานยนาม', 'ไม่ใช่ชื่อทั่วไปแต่เป็นชื่อเฉพาะ', 1, 'contrast sentence'],
    [2, 'วิสามานยนาม', 'ไม่ใช่ชื่อทั่วไป', 1, '"not general" says it is specific'],
    [2, 'นามเฉพาะ', 'ไม่ได้เป็นชื่อทั่วไป', 1, '"was not a general name"'],
    [2, 'ชื่อเฉพาะ', 'เป็นชื่อของบุคคลสำคัญ', 1, 'type given as a descriptive phrase'],
    [2, 'เป็นชื่อเฉพาะของบุคคล', 'วิสามานยนาม', 1, 'the two boxes swapped'],
    [2, 'วิสามานยนาม เพราะเป็นชื่อเฉพาะ', '', 1, 'all in the first box'],
    [2, '', 'วิสามานยนาม เพราะเป็นชื่อเฉพาะของบุคคล', 1, 'all in the second box'],
    [2, 'วิสามานยนาม', 'เป็นชื่อทั่วไป', 0.5, 'reason contradicts the type'],
    [2, 'วิสามานยนาม', 'ไม่เจาะจง', 0.5, 'says the opposite'],
    [2, 'วิสามานยนาม', 'เป็นชื่อสุนทรภู่', 0.5, 'restating the word'],
    [2, 'สามานยนาม', 'เป็นชื่อเฉพาะ', 0.5, 'wrong type, right idea'],
    [2, 'วิสามานยนา', 'เป็นชื่อเฉพาะ', 1, 'type missing its last letter'],
    [2, 'ลักษณนาม', 'เป็นคำนับ', 0, 'completely off'],
  ],

  '3 หนังสือ ๑ เล่ม (ลักษณนาม)': [
    [3, 'ลักษณนาม', 'คำว่าเล่มใช้นับหนังสือ', 1, 'textbook answer'],
    [3, 'ลักษณนาม', 'เป็นคำที่บอกลักษณะของนาม', 1, 'describes what a classifier does'],
    [3, 'ลักษณะนาม', 'เล่ม', 1, 'common misspelling + the key word'],
    [3, 'ลักษณนาม', 'ใช้นับจำนวนหนังสือ', 1, 'used for counting'],
    [3, 'นามบอกลักษณะ', 'ตามหลังตัวเลข', 1, 'everyday name; position after a number'],
    [3, 'ลักษณนาม', 'เพราะ ๑ เล่ม', 1, 'points at the unit word'],
    [3, 'ลักษณนาม', 'บอกว่าหนังสือมีกี่เล่ม', 1, 'asks "how many เล่ม"'],
    [3, 'ลักษณนาม', 'คำว่า เล่ม ไง', 1, 'casual'],
    [3, 'classifier', 'ใช้นับ', 1, 'English'],
    [3, 'ลักษณ', 'นับ', 1, 'very short name'],
    [3, 'สามานยนาม', 'คำว่าเล่มใช้นับ', 0.5, 'wrong type (the book), good reason'],
    [3, 'สมุหนาม', 'เล่มคือกลุ่ม', 0.5, 'wrong type'],
    [3, 'ลักษณนาม', 'เพราะเป็นหนังสือ', 0.5, 'right type, reason only repeats the noun'],
    [3, 'ลักษณนาม', 'หนังสือ ๑ เล่ม', 0.5, 'copied the word as the reason'],
    [3, 'ลักษณนาม', 'ลักษณนาม', 0.5, 'reason is just the type name'],
    [3, 'สามานยนาม', 'เป็นหนังสือทั่วไป', 0, 'wrong type, no idea'],
  ],

  '4 นักเรียน (สามานยนาม)': [
    [4, 'สามานยนาม', 'เป็นชื่อเรียกคน', 1, 'textbook'],
    [4, 'สามานยนาม', 'เรียกได้ทุกคนที่เรียนหนังสือ', 1, 'anyone who studies'],
    [4, 'สามานยนาม', 'เป็นผู้เรียน', 1, 'by who it is'],
    [4, 'สามานยนาม', 'เด็กๆที่มาโรงเรียน', 1, 'by who it is (children)'],
    [4, 'สามัญนาม', 'ทั่วไป', 1, 'alternative name'],
    [4, 'สามานยนาม', 'เพราะไม่ใช่ชื่อเฉพาะของใคร', 1, 'negated "specific"'],
    [4, 'สามานยนาม', 'นักเรียนคือนักเรียน', 0.5, 'circular'],
    [4, 'สามานยนาม', 'เพราะเป็นชื่อเฉพาะของคน', 0.5, 'says "specific": contradicts the type'],
    [4, 'วิสามานยนาม', 'เป็นชื่อของคนที่เรียน', 0.5, 'wrong type, reason names a kind of person'],
    [4, 'นามเฉพาะ', 'เจาะจง', 0, 'wrong on both'],
  ],

  '5 เชียงใหม่ (วิสามานยนาม)': [
    [5, 'วิสามานยนาม', 'เป็นชื่อจังหวัด', 1, 'textbook'],
    [5, 'นามเฉพาะ', 'เป็นชื่อสถานที่เฉพาะ', 1, 'specific place'],
    [5, 'วิสามานยนาม', 'เป็นเมืองทางภาคเหนือ', 1, 'by what it is'],
    [5, 'วิสามานยนาม', 'เพราะเป็นเฉพาะที่นี่ที่เดียว', 1, 'unique'],
    [5, 'วิสามานยนาม', 'จังหวัด', 1, 'one word'],
    [5, 'สามานยนาม', 'เป็นชื่อสถานที่', 0.5, 'wrong type, reason ok'],
    [5, 'วิสามานยนาม', 'ชื่อทั่วไปของเมือง', 0.5, 'contradiction'],
    [5, 'วิสามานยนาม', 'เชียงใหม่คือเชียงใหม่', 0.5, 'circular'],
  ],

  '6 การนอน (อาการนาม)': [
    [6, 'อาการนาม', 'มีคำว่าการนำหน้ากริยา', 1, 'the การ clue'],
    [6, 'อาการนาม', 'เกิดจากคำกริยานอน', 1, 'from a verb'],
    [6, 'อาการนาม', 'เพราะเป็นการกระทำ', 1, 'an action'],
    [6, 'อาการนาม', 'นามธรรม', 1, 'abstract as the reason'],
    [6, 'นามธรรม', 'ไม่มีตัวตน', 1, 'abstract: no physical form'],
    [6, 'อาการนาม', 'เพราะการนอน', 0.5, 'circular'],
    [6, 'วิสามานยนาม', 'ใช้การนำหน้า', 0.5, 'wrong type, good reason'],
    [6, 'สามานยนาม', 'เป็นชื่อเรียกทั่วไป', 0, 'wrong on both'],
  ],

  '7 รถคันที่สาม (ลักษณนาม)': [
    [7, 'ลักษณนาม', 'คำว่าคันบอกลักษณะของรถ', 1, 'textbook'],
    [7, 'ลักษณนาม', 'ใช้นับรถ', 1, 'counting'],
    [7, 'ลักษณนาม', 'เป็นคำบอกจำนวนของรถ', 1, 'how many'],
    [7, 'ลักษณะนาม', 'คัน', 1, 'misspelling + the key word'],
    [7, 'ลักษณนาม', 'รถคันที่สาม', 0.5, 'copied the word'],
    [7, 'ลักษณนาม', 'ที่สามคือลำดับที่', 0.5, 'talks about the ordinal, not the classifier'],
    [7, 'สามานยนาม', 'เพราะเป็นรถ', 0, 'wrong on both'],
  ],

  '8 การเมือง (อาการนาม, ร่าง)': [
    [8, 'อาการนาม', 'มีคำว่าการนำหน้า', 1, 'the การ clue'],
    [8, 'อาการนาม', 'เกี่ยวกับการปกครองบ้านเมือง', 1, 'by meaning'],
    [8, 'อาการนาม', 'การเมืองคือการเมือง', 0.5, 'circular'],
    [8, 'สามานยนาม', 'เป็นชื่อเรียกทั่วไป', 0, 'wrong on both'],
  ],
}

describe.each(Object.entries(SUITES))('%s', (_name, rows) => {
  it.each(rows)('digit %i: [%s | %s] -> %s  (%s)', (digit, word, reason, points) => {
    expect(gradeWord(digit, { word, reason }, { reveal: true }).points).toBe(points)
  })
})

describe('robustness', () => {
  it('is not case sensitive for English names', () => {
    expect(gradeWord(2, { word: 'PROPER NOUN', reason: 'เจาะจง' }, { reveal: true }).points).toBe(1)
    expect(gradeWord(0, { word: 'Common Noun', reason: 'ทั่วไป' }, { reveal: true }).points).toBe(1)
  })
  it('always returns 0, 0.5 or 1', () => {
    const junk = ['', ' ', '???', '555555', 'ก'.repeat(200), 'ไม่ ไม่ ไม่ ไม่ ไม่', '🙂🙂🙂', '<script>alert(1)</script>', 'null', 'undefined']
    for (const digit of [0, 1, 2, 3, 4, 5, 6, 7, 8])
      for (const w of junk)
        for (const r of junk) expect([0, 0.5, 1]).toContain(gradeWord(digit, { word: w, reason: r }, { reveal: false }).points)
  })
  it('stays fast on the longest allowed input (name 40, reason 200 characters)', () => {
    const t0 = performance.now()
    for (let i = 0; i < 20; i++) gradeWord(2, { word: 'ก'.repeat(40), reason: 'ขอบคุณครับ '.repeat(20) }, { reveal: true })
    expect(performance.now() - t0).toBeLessThan(400)
  })
  it('refuses a word that has no answer key (digit 9) instead of guessing', () => {
    expect(() => gradeWord(9, { word: 'สามานยนาม', reason: 'ทั่วไป' }, { reveal: true })).toThrow(MissingAnswerKeyError)
  })
  it('a perfect worksheet is 4 and an empty one is 0', () => {
    const perfect = [
      { word: 'สามานยนาม', reason: 'เป็นชื่อเรียกทั่วไป' },
      { word: 'อาการนาม', reason: 'มีคำว่าความนำหน้า' },
      { word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะของบุคคล' },
      { word: 'ลักษณนาม', reason: 'ใช้นับ' },
    ]
    expect(gradeWorksheet([0, 1, 2, 3], perfect, { reveal: true }).total).toBe(4)
    expect(gradeWorksheet([0, 1, 2, 3], Array(4).fill({ word: '', reason: '' }), { reveal: true }).total).toBe(0)
  })
})
