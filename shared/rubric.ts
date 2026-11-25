// Answer key + scoring rubric for the auto-grader.
//
// STATUS: the ANSWER KEY (which type each digit is) is confirmed by the teacher for all ten words. The keyword
// lists are still a DRAFT written by the developer from general Thai grammar and should be reviewed.
// Each word is worth 1 point = 0.5 (the noun type is right) + 0.5 (the reason shows the idea, i.e. contains
// rubric keywords). Everything here is matched LOOSELY (see shared/grade.ts): spaces, tone marks, punctuation,
// ๆ and stretched letters are ignored, and a keyword that is negated ("ไม่", "ไม่ใช่", "ไม่ได้") does not count.

export type NounTypeKey = 'common' | 'proper' | 'classifier' | 'abstract' | 'collective'

export interface NounTypeRubric {
  /** Canonical name shown to students in feedback. */
  name: string
  /**
   * Ways a student may NAME this type in the "ชนิดคำนาม" box: official names, short forms, everyday phrasing,
   * English, common misspellings. A single typo is tolerated automatically on the longer names.
   */
  aliases: string[]
  /**
   * Ways a student may EXPLAIN it. The reason earns its 0.5 when it contains at least `reasonMin` of these.
   * Keep them as short stems ("ทั่วไป") so inflections and rephrasings still match.
   */
  keywords: string[]
  /**
   * Names of this type that merely repeat the answer ("เพราะเป็นอาการนาม"). They are cut out of the reason before
   * it is checked, so a keyword hiding inside the name (อาการ in อาการนาม) cannot earn the 0.5 by itself.
   */
  nameOnly: string[]
  /** A reason containing any of these (un-negated) is contradicting the answer and gets no credit. */
  forbidden?: string[]
  reasonMin?: number
  /** One-line explanation shown as feedback. */
  explanation: string
}

export const NOUN_TYPES: Record<NounTypeKey, NounTypeRubric> = {
  // สามานยนาม: ordinary names for people, animals, things, places in general
  common: {
    name: 'สามานยนาม',
    aliases: [
      'สามานยนาม', 'สามัญนาม', 'นามสามัญ', 'นามทั่วไป', 'ชื่อทั่วไป', 'คำนามทั่วไป', 'ชื่อสามัญ', 'สามานย', 'สามัญ',
      'นามไม่เจาะจง', 'ไม่เฉพาะเจาะจง', 'ไม่เจาะจง', 'ไม่เฉพาะ', 'ทั่วไป',
      'common', 'commonnoun',
    ],
    keywords: [
      // it is general / not specific
      'ทั่วไป', 'สามัญ', 'ไม่เจาะจง', 'ไม่เฉพาะเจาะจง', 'ไม่เฉพาะ', 'ไม่ระบุ', 'ไม่ชี้เฉพาะ', 'ไม่ชี้ชัด', 'ไม่บ่งชี้',
      'ไม่ใช่ชื่อเฉพาะ', 'ไม่ใช่นามเฉพาะ', 'ไม่ใช่ชื่อคน', 'ไม่ใช่ชื่อจังหวัด', 'ไม่ใช่ชื่อสถานที่',
      // it can name many / anything
      'เรียกได้ทั่ว', 'เรียกได้ทุก', 'เรียกได้หลาย', 'ใช้ได้ทั่ว', 'ใช้ได้กับ', 'ใครก็ได้', 'อะไรก็ได้', 'ตัวไหนก็ได้',
      'ทุกคน', 'ทุกอย่าง', 'ทุกชนิด', 'ทุกตัว', 'ทุกสิ่ง', 'ทุกที่', 'หลายอย่าง', 'หลายชนิด', 'หลายตัว', 'หลายคน',
      'เรียกรวม', 'ชื่อรวม', 'คำรวม',
      // it is the name of a kind of thing
      'ชื่อเรียกคน', 'ชื่อเรียกสัตว์', 'ชื่อเรียกสิ่ง', 'ชื่อเรียกสถานที่', 'ชื่อเรียก', 'ใช้เรียกคน', 'ใช้เรียกสัตว์',
      'ใช้เรียกสิ่ง', 'ใช้เรียกสถานที่', 'เรียกคน', 'เรียกสัตว์', 'เรียกสิ่ง', 'เรียกสถานที่', 'เรียกพืช', 'เรียกผลไม้',
      'เรียกอาหาร', 'ชื่อสิ่งของ', 'ชื่อสัตว์', 'ชื่อผลไม้', 'ชื่อพืช', 'ชื่อคน', 'ชื่อของคน', 'ชื่อของสิ่ง',
    ],
    nameOnly: ['สามานยนาม', 'สามัญนาม', 'นามสามัญ', 'สามานย'],
    forbidden: ['เฉพาะ', 'เจาะจง'],
    explanation: 'เป็นชื่อเรียกคน สัตว์ สิ่งของ หรือสถานที่ทั่วไป โดยไม่เจาะจง',
  },

  // วิสามานยนาม: a specific name (a particular person, place, ...)
  proper: {
    name: 'วิสามานยนาม',
    aliases: [
      'วิสามานยนาม', 'วิสามัญนาม', 'นามวิสามัญ', 'นามเฉพาะ', 'ชื่อเฉพาะ', 'คำนามเฉพาะ', 'วิสามานย', 'วิสามัญ',
      'นามเฉพาะเจาะจง', 'เฉพาะเจาะจง', 'เฉพาะ',
      'proper', 'propernoun',
    ],
    keywords: [
      // it is specific
      'เฉพาะ', 'เจาะจง', 'ชี้เฉพาะ', 'ชี้ชัด', 'บ่งชี้', 'ระบุ', 'ระบุชื่อ', 'ระบุตัว', 'ชื่อเฉพาะ', 'ชื่อจริง',
      // it is NOT general (a correct way to say it is specific)
      'ไม่ทั่วไป', 'ไม่ใช่ชื่อทั่วไป', 'ไม่ใช่นามทั่วไป', 'ไม่สามัญ', 'ไม่ใช่ชื่อสามัญ',
      // it is unique
      'หนึ่งเดียว', 'เพียงหนึ่ง', 'เพียงแห่งเดียว', 'คนเดียว', 'แห่งเดียว', 'ที่เดียว', 'ตัวเดียว', 'ไม่ซ้ำ',
      'ไม่มีใครเหมือน', 'ไม่มีที่ไหนเหมือน', 'มีเพียง', 'เฉพาะตัว', 'เฉพาะบุคคล', 'เฉพาะที่',
      // it is the name of a particular person / place
      'ชื่อคน', 'ชื่อบุคคล', 'ชื่อสถานที่', 'ชื่อจังหวัด', 'ชื่อเมือง', 'ชื่อประเทศ', 'ชื่อของคน', 'ชื่อของบุคคล',
      'ชื่อของสถานที่', 'ชื่อของจังหวัด', 'ชื่อของเมือง', 'ชื่อของกวี',
    ],
    nameOnly: ['วิสามานยนาม', 'วิสามัญนาม', 'นามวิสามัญ', 'วิสามานย'],
    forbidden: ['ทั่วไป', 'สามัญ', 'ไม่เจาะจง', 'ไม่เฉพาะ', 'ไม่ระบุ'],
    explanation: 'เป็นชื่อเฉพาะที่เจาะจงว่าเป็นคน สัตว์ สิ่งของ หรือสถานที่ใดโดยเฉพาะ',
  },

  // ลักษณนาม: the word that counts / describes the kind of thing (เล่ม คัน ตัว ...)
  classifier: {
    name: 'ลักษณนาม',
    aliases: [
      'ลักษณนาม', 'ลักษณะนาม', 'นามบอกลักษณะ', 'คำลักษณนาม', 'นามลักษณะ', 'ลักษณะ', 'ลักษณ',
      'classifier', 'measureword',
    ],
    keywords: [
      'ลักษณะ', 'บอกลักษณะ', 'นับ', 'ใช้นับ', 'ตัวนับ', 'คำนับ', 'หน่วยนับ', 'หน่วย',
      'บอกจำนวน', 'บอกปริมาณ', 'จำนวน', 'ปริมาณ', 'ตัวเลข', 'ตามหลังตัวเลข', 'ตามหลัง', 'อยู่หลัง', 'ใช้หลัง',
      'ขยายนาม', 'ขยาย', 'ประกอบนาม', 'บอกชนิด', 'ใช้บอก', 'ใช้ประกอบ',
    ],
    nameOnly: ['ลักษณนาม', 'ลักษณะนาม', 'คำลักษณนาม', 'นามลักษณะ', 'นามบอกลักษณะ'],
    explanation: 'เป็นคำที่ใช้บอกลักษณะของนามที่อยู่ข้างหน้า หรือใช้นับสิ่งนั้น',
  },

  // อาการนาม: a noun formed from a verb/adjective, usually with การ / ความ in front
  abstract: {
    name: 'อาการนาม',
    aliases: [
      'อาการนาม', 'นามบอกอาการ', 'นามอาการ', 'นามธรรม', 'อาการ', 'อาการะนาม', 'อากานาม',
      'abstract', 'abstractnoun',
    ],
    keywords: [
      // the clue words การ / ความ in front
      'การ', 'ความ', 'นำหน้า', 'ขึ้นต้น', 'ต้นด้วย', 'อยู่หน้า', 'อยู่ข้างหน้า', 'ข้างหน้า', 'ตามด้วย',
      // it comes from a verb / adjective
      'อาการ', 'กริยา', 'กิริยา', 'วิเศษณ์', 'เกิดจาก', 'มาจาก', 'ทำให้เป็นนาม', 'เปลี่ยนเป็นนาม', 'แปลงเป็นนาม',
      'ใช้เป็นนาม', 'กลายเป็นนาม',
      // it is not a physical thing
      'นามธรรม', 'ไม่มีตัวตน', 'จับต้องไม่ได้', 'จับไม่ได้', 'สัมผัสไม่ได้', 'มองไม่เห็น', 'ไม่ใช่สิ่งของ', 'ไม่ใช่วัตถุ',
      'ความรู้สึก', 'ความคิด', 'อารมณ์', 'การกระทำ', 'การเคลื่อนไหว', 'สภาพ', 'สภาวะ', 'ภาวะ', 'บอกอาการ', 'บอกสภาพ',
    ],
    nameOnly: ['อาการนาม', 'นามบอกอาการ', 'นามอาการ', 'อาการะนาม', 'อากานาม'],
    explanation: 'เป็นนามที่เกิดจากคำกริยาหรือคำวิเศษณ์ มักมีคำว่า การ หรือ ความ นำหน้า',
  },

  // สมุหนาม: the name of a group
  collective: {
    name: 'สมุหนาม',
    aliases: ['สมุหนาม', 'นามบอกหมู่', 'นามบอกกลุ่ม', 'นามหมู่', 'นามกลุ่ม', 'สมุห', 'collective', 'collectivenoun'],
    keywords: [
      'กลุ่ม', 'หมู่', 'ฝูง', 'กอง', 'ชุด', 'คณะ', 'มวล', 'พวก', 'รวมกัน', 'รวมกลุ่ม', 'จำนวนมาก', 'หลายตัว', 'หลายคน',
      'บอกหมู่', 'บอกกลุ่ม', 'สมุห',
    ],
    nameOnly: ['สมุหนาม', 'นามบอกหมู่', 'นามบอกกลุ่ม', 'นามหมู่', 'นามกลุ่ม'],
    explanation: 'เป็นนามที่บอกหมู่หรือกลุ่มของสิ่งนั้น',
  },
}

export interface DigitRubric {
  /** The expected noun type. null = no answer key yet (the grader refuses to score it). */
  type: NounTypeKey | null
  /** Other types that are also acceptable for this word (teacher's call; empty = only `type`). */
  alsoAccept?: NounTypeKey[]
  /**
   * Reason keywords specific to this word, on top of the type's own: the category the word belongs to, what it is
   * made of. Restating the word itself never counts (the grader removes it from the reason first).
   */
  extraKeywords?: string[]
}

/** digit -> expected answer. The words themselves live in shared/drawn.ts. */
export const DIGIT_RUBRIC: readonly DigitRubric[] = [
  // 0 มะนาว
  { type: 'common', extraKeywords: ['ผลไม้', 'พืช', 'ต้นไม้', 'ของกิน', 'อาหาร', 'เครื่องปรุง', 'ผลหนึ่ง', 'ลูกหนึ่ง', 'ลูกไหน', 'ลูกใด'] },
  // 1 ความรัก
  { type: 'abstract', extraKeywords: ['ความรู้สึก', 'ใจ', 'หัวใจ', 'รู้สึก'] },
  // 2 สุนทรภู่
  { type: 'proper', extraKeywords: ['กวี', 'กวีเอก', 'นักกลอน', 'ผู้แต่ง', 'ผู้ประพันธ์', 'พระอภัยมณี', 'บุคคลสำคัญ', 'คนหนึ่ง', 'ท่านหนึ่ง'] },
  // 3 หนังสือ ๑ เล่ม
  { type: 'classifier', extraKeywords: ['เล่ม', 'คำว่าเล่ม'] },
  // 4 นักเรียน
  { type: 'common', extraKeywords: ['คน', 'บุคคล', 'ผู้เรียน', 'เด็ก', 'ผู้ที่เรียน', 'ผู้ศึกษา', 'ผู้ที่ศึกษา', 'ศิษย์'] },
  // 5 เชียงใหม่
  { type: 'proper', extraKeywords: ['จังหวัด', 'เมือง', 'ภาคเหนือ', 'สถานที่', 'ล้านนา', 'ที่ท่องเที่ยว', 'ที่หนึ่ง', 'แห่งหนึ่ง'] },
  // 6 การนอน
  { type: 'abstract', extraKeywords: ['การกระทำ', 'ท่าทาง'] },
  // 7 รถคันที่สาม
  { type: 'classifier', extraKeywords: ['คัน', 'คำว่าคัน'] },
  // 8 การเมือง: สามานยนาม (confirmed by the teacher). It starts with การ, but it is NOT อาการนาม: a classic trap.
  { type: 'common', extraKeywords: ['เรื่อง', 'ปกครอง', 'บ้านเมือง', 'บริหารประเทศ', 'รัฐบาล', 'กิจกรรม', 'สิ่งหนึ่ง'] },
  // 9 อกร่อง: สามานยนาม (confirmed by the teacher)
  { type: 'common', extraKeywords: ['ร่างกาย', 'อวัยวะ', 'ส่วนของร่างกาย', 'ส่วนหนึ่ง'] },
]

export const RUBRIC_STATUS: 'draft' | 'confirmed' = 'draft'
