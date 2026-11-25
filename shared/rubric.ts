// Answer key + scoring rubric for the auto-grader.
//
// STATUS: DRAFT. Written by the developer from general Thai grammar; the teacher must confirm or replace it.
// Each word is worth 1 point = 0.5 (noun type is right) + 0.5 (the reason contains the rubric's keywords).

export interface NounTypeRubric {
  /** Canonical name shown to students in feedback. */
  name: string
  /** Names a student may write for this type (matched after normalisation; typos tolerated). */
  aliases: string[]
  /** The reason earns its 0.5 when it contains at least `reasonMin` of these words. */
  keywords: string[]
  /** A reason containing any of these is never credited (e.g. "ไม่เจาะจง" must not count as "เจาะจง"). */
  forbidden?: string[]
  reasonMin?: number
  /** One-line explanation shown as feedback. */
  explanation: string
}

export const NOUN_TYPES = {
  common: {
    name: 'สามานยนาม',
    aliases: ['สามานยนาม', 'สามัญนาม', 'นามทั่วไป', 'ชื่อทั่วไป', 'นามสามัญ'],
    keywords: ['ทั่วไป', 'ไม่เจาะจง', 'ไม่เฉพาะเจาะจง', 'เรียกคน', 'เรียกสัตว์', 'เรียกสิ่ง', 'ชื่อเรียก'],
    explanation: 'เป็นชื่อเรียกคน สัตว์ สิ่งของ หรือสถานที่ทั่วไป โดยไม่เจาะจง',
  },
  proper: {
    name: 'วิสามานยนาม',
    aliases: ['วิสามานยนาม', 'วิสามัญนาม', 'นามเฉพาะ', 'ชื่อเฉพาะ', 'นามวิสามัญ'],
    keywords: ['เฉพาะ', 'เจาะจง', 'ชื่อคน', 'ชื่อบุคคล', 'ชื่อสถานที่', 'ชื่อจังหวัด'],
    forbidden: ['ไม่เจาะจง', 'ไม่เฉพาะ', 'ทั่วไป'],
    explanation: 'เป็นชื่อเฉพาะที่เจาะจงว่าเป็นคน สัตว์ สิ่งของ หรือสถานที่ใดโดยเฉพาะ',
  },
  classifier: {
    name: 'ลักษณนาม',
    aliases: ['ลักษณนาม', 'นามบอกลักษณะ'],
    keywords: ['ลักษณะ', 'นับ', 'บอกจำนวน', 'ใช้บอก'],
    explanation: 'เป็นคำที่ใช้บอกลักษณะของนามที่อยู่ข้างหน้า หรือใช้นับสิ่งนั้น',
  },
  abstract: {
    name: 'อาการนาม',
    aliases: ['อาการนาม', 'นามบอกอาการ'],
    keywords: ['การ', 'ความ', 'อาการ', 'กริยา', 'นำหน้า'],
    explanation: 'เป็นนามที่เกิดจากคำกริยาหรือคำวิเศษณ์ มักมีคำว่า การ หรือ ความ นำหน้า',
  },
  collective: {
    name: 'สมุหนาม',
    aliases: ['สมุหนาม', 'นามบอกหมู่'],
    keywords: ['กลุ่ม', 'หมู่', 'ฝูง', 'กอง', 'ชุด'],
    explanation: 'เป็นนามที่บอกหมู่หรือกลุ่มของสิ่งนั้น',
  },
} satisfies Record<string, NounTypeRubric>

export type NounTypeKey = keyof typeof NOUN_TYPES

export interface DigitRubric {
  /** null = no answer key yet (the grader refuses to score it). */
  type: NounTypeKey | null
  /** Extra reason keywords specific to this word, on top of the type's own. */
  extraKeywords?: string[]
}

/** digit -> expected noun type. Words themselves live in shared/drawn.ts. */
export const DIGIT_RUBRIC: readonly DigitRubric[] = [
  { type: 'common' }, // 0 มะนาว
  { type: 'abstract' }, // 1 ความรัก
  { type: 'proper' }, // 2 สุนทรภู่
  { type: 'classifier', extraKeywords: ['เล่ม'] }, // 3 หนังสือ ๑ เล่ม
  { type: 'common' }, // 4 นักเรียน
  { type: 'proper' }, // 5 เชียงใหม่
  { type: 'abstract' }, // 6 การนอน
  { type: 'classifier', extraKeywords: ['คัน'] }, // 7 รถคันที่สาม
  { type: 'abstract' }, // 8 การเมือง   <- TO CONFIRM (draft)
  { type: null }, // 9 อกร่อง     <- NO ANSWER KEY YET
]

export const RUBRIC_STATUS: 'draft' | 'confirmed' = 'draft'
