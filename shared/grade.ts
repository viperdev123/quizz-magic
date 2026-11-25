import { normalizeName } from './normalize'
import { DIGIT_RUBRIC, NOUN_TYPES, type NounTypeKey } from './rubric'

/** Compare Thai text loosely: NFC, no zero-width chars/spaces, no tone marks or thanthakhat, lowercase. */
export function normalizeForMatch(input: string): string {
  // normalizeName: NFC, zero-width chars, trim, lowercase; then drop tone marks and all spaces
  return normalizeName(input)
    .replace(new RegExp('[\\u0E47-\\u0E4C]', 'g'), '') // ็ ่ ้ ๊ ๋ ์
    .replace(/\s+/g, '')
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length]![b.length]!
}

const ALIASES = (Object.entries(NOUN_TYPES) as [NounTypeKey, (typeof NOUN_TYPES)[NounTypeKey]][])
  .flatMap(([key, t]) => t.aliases.map((alias) => ({ key, alias: normalizeForMatch(alias) })))
  .sort((a, b) => b.alias.length - a.alias.length) // longest first, so วิสามานยนาม is taken before สามานยนาม

/** Which noun type(s) does the student's answer name? */
export function detectTypes(answer: string): Set<NounTypeKey> {
  let rest = normalizeForMatch(answer)
  const found = new Set<NounTypeKey>()
  for (const { key, alias } of ALIASES) {
    if (rest.includes(alias)) {
      found.add(key)
      rest = rest.split(alias).join('§') // consume it so a longer name never also counts as its own substring
    }
  }
  if (found.size === 0) {
    // tolerate one slip of the keyboard (a missing, extra or wrong letter) anywhere in the answer
    const near: { key: NounTypeKey; len: number; dist: number }[] = []
    for (const { key, alias } of ALIASES) {
      if (alias.length < 5) continue
      let best = 2
      for (let len = alias.length - 1; len <= alias.length + 1; len++)
        for (let at = 0; at + len <= rest.length; at++) best = Math.min(best, editDistance(rest.slice(at, at + len), alias))
      if (best <= 1) near.push({ key, len: alias.length, dist: best })
    }
    // closest name wins, then the longest (a slip in วิสามานยนาม must not read as the สามานยนาม hidden inside it)
    near.sort((a, b) => a.dist - b.dist || b.len - a.len)
    const top = near[0]
    if (top && !near.some((n) => n.key !== top.key && n.dist === top.dist && n.len === top.len)) found.add(top.key)
  }
  return found
}

export function reasonHasKeywords(reason: string, type: NounTypeKey, extra: string[] = []): boolean {
  const t = NOUN_TYPES[type]
  const text = normalizeForMatch(reason)
  if (!text) return false
  if ((t as { forbidden?: string[] }).forbidden?.some((f) => text.includes(normalizeForMatch(f)))) return false
  const need = (t as { reasonMin?: number }).reasonMin ?? 1
  const hits = [...t.keywords, ...extra].filter((k) => text.includes(normalizeForMatch(k)))
  return new Set(hits).size >= need
}

export interface WordGrade {
  typeOk: boolean
  reasonOk: boolean
  /** 0, 0.5 or 1 */
  points: number
  expectedType: string
  feedback: string
}

export class MissingAnswerKeyError extends Error {}

/** 0.5 for naming the right noun type + 0.5 for a reason containing the rubric's keywords. */
export function gradeWord(
  digit: number,
  answer: { word: string; reason: string },
  opts: { reveal: boolean },
): WordGrade {
  const rubric = DIGIT_RUBRIC[digit]
  if (!rubric || rubric.type === null) throw new MissingAnswerKeyError(`no answer key for digit ${digit}`)
  const type = NOUN_TYPES[rubric.type]

  const named = detectTypes(answer.word)
  const typeOk = named.size === 1 && named.has(rubric.type) // naming several types is hedging, not an answer
  const reasonOk = reasonHasKeywords(answer.reason, rubric.type, rubric.extraKeywords)
  const points = (typeOk ? 0.5 : 0) + (reasonOk ? 0.5 : 0)

  let feedback: string
  if (typeOk && reasonOk) feedback = 'ถูกต้องเลย! ตอบชนิดคำนามและเหตุผลได้ครบ'
  else if (typeOk) feedback = 'ชนิดคำนามถูกแล้ว แต่เหตุผลยังไม่ครบ ลองอธิบายให้ชัดขึ้นอีกนิด' + (opts.reveal ? ` เช่น ${type.explanation}` : '')
  else if (reasonOk) feedback = 'เหตุผลใช้ได้ แต่ชนิดคำนามยังไม่ตรง' + (opts.reveal ? ` ชนิดที่ถูกคือ ${type.name}` : '')
  else feedback = 'ลองคิดอีกครั้งนะ' + (opts.reveal ? ` ชนิดที่ถูกคือ ${type.name} เพราะ${type.explanation}` : '')

  return { typeOk, reasonOk, points, expectedType: type.name, feedback }
}

export interface WorksheetGrade {
  items: WordGrade[]
  /** 0 - 4 in steps of 0.5 */
  total: number
}

export function gradeWorksheet(
  digits: number[],
  words: { word: string; reason: string }[],
  opts: { reveal: boolean },
): WorksheetGrade {
  const items = digits.map((d, i) => gradeWord(d, words[i] ?? { word: '', reason: '' }, opts))
  const total = items.reduce((s, it) => s + it.points, 0)
  return { items, total }
}
