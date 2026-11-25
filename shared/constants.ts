export const LEVELS = [
  'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
  'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6',
] as const
export type Level = (typeof LEVELS)[number]

export const LIMITS = {
  room: { min: 1, max: 30 },
  studentNo: { min: 1, max: 99 },
  name: 80,
  noun: 40,
  word: 40,
  reason: 200,
} as const

export const WORD_COUNT = 4

/** Shown in the page header (design: "ม.1 • ภาษาไทย") */
export const ACTIVITY_LABEL = 'ม.1 • ภาษาไทย'

export const MESSAGES = {
  invalid: 'กรอกข้อมูลให้ครบทุกช่องก่อนนะ',
  locked: 'ครูตรวจงานของคุณแล้ว จึงส่งใหม่ไม่ได้ หากต้องการแก้ไขให้แจ้งครูนะ',
  mismatch: 'ชื่อไม่ตรงกับที่เคยส่งไว้ กรุณาตรวจสอบชั้น ห้อง เลขที่ หรือสอบถามครู',
  notFound: 'ไม่พบงาน ลองตรวจสอบชั้น ห้อง และเลขที่อีกครั้งนะ',
  turnstile: 'ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  turnstilePending: 'รอสักครู่ แล้วกดยืนยันว่าไม่ใช่โปรแกรมอัตโนมัติก่อนนะ',
  rateLimited: 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
  error: 'มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้ง',
} as const
