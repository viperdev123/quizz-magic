// The word tied to each drawn digit. Hard-coded on purpose: students cannot edit it, and the
// server derives the stored value from the digit (never trusts the client's text).
export const DRAWN_NOUNS = [
  'มะนาว', // 0
  'ความรัก', // 1
  'สุนทรภู่', // 2
  'หนังสือ ๑ เล่ม', // 3
  'นักเรียน', // 4
  'เชียงใหม่', // 5
  'การนอน', // 6
  'รถคันที่สาม', // 7
  'การเมือง', // 8
  'อกร่อง', // 9
] as const

/** Part of a drawn noun shown in red (full noun -> highlighted part). */
export const DRAWN_NOUN_EMPHASIS: Readonly<Record<string, string>> = {
  'หนังสือ ๑ เล่ม': 'เล่ม',
  รถคันที่สาม: 'คัน',
}

export function drawnNounFor(digit: number | string): string {
  return DRAWN_NOUNS[Number(digit)] ?? ''
}

export interface NounSegment {
  text: string
  emphasis: boolean
}

/** Split a noun into plain / emphasised parts, for rendering without v-html. */
export function nounSegments(noun: string): NounSegment[] {
  const part = DRAWN_NOUN_EMPHASIS[noun]
  const at = part ? noun.indexOf(part) : -1
  if (!part || at < 0) return [{ text: noun, emphasis: false }]
  return [
    { text: noun.slice(0, at), emphasis: false },
    { text: part, emphasis: true },
    { text: noun.slice(at + part.length), emphasis: false },
  ].filter((s) => s.text !== '')
}

// Thai digits are for display only; everything stored or sent uses Arabic digits.
const THAI_ZERO = 0x0e50
export const toThaiDigits = (s: string): string =>
  s.replace(/[0-9]/g, (d) => String.fromCharCode(THAI_ZERO + Number(d)))
export const toArabicDigits = (s: string): string =>
  s.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - THAI_ZERO))
