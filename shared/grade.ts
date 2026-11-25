import { drawnNounFor } from './drawn'
import { normalizeName } from './normalize'
import { DIGIT_RUBRIC, NOUN_TYPES, type NounTypeKey } from './rubric'

// ---------------------------------------------------------------------------------------------------------
// Loose text matching. Students type fast on phones, so everything is compared after removing what carries
// no meaning: spaces, punctuation/emoji, tone marks, thanthakhat, ๆ, and stretched letters ("นามมมม").
// Negations ("ไม่", "ไม่ใช่", "ไม่ได้", "มิใช่" ...) are all folded into one marker so we can tell
// "ไม่ใช่ชื่อเฉพาะ" (not specific) from "ชื่อเฉพาะ" (specific).
// ---------------------------------------------------------------------------------------------------------

const NEG = '¬'
const NEGATIONS = ['ไม่ได้เป็น', 'ไม่เป็น', 'ไม่ได้', 'ไม่ใช่', 'มิใช่', 'หาใช่', 'ไม่']
// ๆ ็ ่ ้ ๊ ๋ ์ (listed one by one: they are combining marks, which lint does not like inside a [] class)
const IGNORED_MARKS = new RegExp(
  ['\\u0E46', '\\u0E47', '\\u0E48', '\\u0E49', '\\u0E4A', '\\u0E4B', '\\u0E4C'].join('|'),
  'g',
)
const NOT_TEXT = new RegExp('[^\\p{L}\\p{M}\\p{N}' + NEG + ']', 'gu') // spaces, punctuation, emoji
const STRETCHED = new RegExp('(.)\\1{2,}', 'gu') // 3+ of the same character in a row
const NEG_WINDOW = 10 // a negation this close before a word flips it

export function normalizeForMatch(input: string): string {
  let s = normalizeName(input)
  for (const n of NEGATIONS) s = s.split(n).join(NEG)
  return s.replace(IGNORED_MARKS, '').replace(NOT_TEXT, '').replace(STRETCHED, '$1')
}

/** Does `text` contain `term` that is not negated by a nearby "ไม่ / ไม่ใช่ / ไม่ได้"? */
export function containsUnnegated(text: string, term: string): boolean {
  if (!term) return false
  if (term.startsWith(NEG)) return text.includes(term) // the term carries its own negation
  for (let from = 0; ; ) {
    const at = text.indexOf(term, from)
    if (at < 0) return false
    if (!text.slice(Math.max(0, at - NEG_WINDOW), at).includes(NEG)) return true
    from = at + 1
  }
}

/** Edit distance, or limit+1 as soon as it is certain to exceed `limit` (keeps the typo search cheap). */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      cur.push(v)
      if (v < rowMin) rowMin = v
    }
    if (rowMin > limit) return limit + 1
    prev = cur
  }
  return prev[b.length]!
}

// The type box holds at most 40 characters; slips are only forgiven in text this short, never in long reasons.
const MAX_TYPO_TEXT = 60

const uniq = (xs: string[]) => [...new Set(xs.map(normalizeForMatch).filter(Boolean))]
const TYPE_KEYS = Object.keys(NOUN_TYPES) as NounTypeKey[]
const COMPILED = Object.fromEntries(
  TYPE_KEYS.map((k) => {
    const t = NOUN_TYPES[k]
    return [k, { aliases: uniq(t.aliases), keywords: uniq(t.keywords), forbidden: uniq(t.forbidden ?? []), reasonMin: t.reasonMin ?? 1 }]
  }),
) as Record<NounTypeKey, { aliases: string[]; keywords: string[]; forbidden: string[]; reasonMin: number }>

// names that only repeat the answer, longest first; cut out of reasons (see NounTypeRubric.nameOnly)
const NAME_ONLY = uniq(TYPE_KEYS.flatMap((k) => NOUN_TYPES[k].nameOnly)).sort((a, b) => b.length - a.length)

// longest names first, so วิสามานยนาม is read before the สามานยนาม hidden inside it
const ALIASES = TYPE_KEYS.flatMap((key) => COMPILED[key].aliases.map((alias) => ({ key, alias }))).sort(
  (a, b) => b.alias.length - a.alias.length,
)

interface TypeReading {
  types: Set<NounTypeKey>
  /** What is left of the answer once the type names are taken out: it may hold the reason too. */
  residue: string
}

function readType(answer: string): TypeReading {
  let rest = normalizeForMatch(answer)
  const types = new Set<NounTypeKey>()
  let consumed = false
  for (const { key, alias } of ALIASES) {
    if (!rest.includes(alias)) continue
    if (containsUnnegated(rest, alias)) types.add(key)
    rest = rest.split(alias).join('§') // consume it so a longer name never also counts as its own substring
    consumed = true
  }
  if (!consumed && rest.length > 0 && rest.length <= MAX_TYPO_TEXT) {
    // tolerate slips of the keyboard (a missing, extra or wrong letter) anywhere in the answer
    const near: { key: NounTypeKey; len: number; dist: number }[] = []
    for (const { key, alias } of ALIASES) {
      // a typo must never bridge a negation: "เจาะจง" (specific) is one letter from "ไม่เจาะจง" (not specific)
      if (alias.includes(NEG)) continue
      const limit = alias.length >= 9 ? 2 : alias.length >= 6 ? 1 : 0
      if (limit === 0) continue
      let best = limit + 1
      for (let len = alias.length - limit; len <= alias.length + limit; len++)
        for (let at = 0; at + len <= rest.length; at++) best = Math.min(best, editDistance(rest.slice(at, at + len), alias, limit))
      if (best <= limit) near.push({ key, len: alias.length, dist: best })
    }
    // closest name wins, then the longest (a slip in วิสามานยนาม must not read as the สามานยนาม hidden inside it)
    near.sort((a, b) => a.dist - b.dist || b.len - a.len)
    const top = near[0]
    if (top && !near.some((n) => n.key !== top.key && n.dist === top.dist && n.len === top.len)) types.add(top.key)
  }
  return { types, residue: rest.split('§').join('') }
}

/** Which noun type(s) does the text name? Naming more than one is hedging. */
export function detectTypes(answer: string): Set<NounTypeKey> {
  return readType(answer).types
}

/**
 * Does the reason show the idea? It needs a rubric keyword for the expected type that is not negated, must not
 * contradict it (forbidden words), must not be keyword-stuffing for many other types, and restating the given
 * word itself does not count.
 */
export function reasonHasKeywords(
  reason: string,
  types: NounTypeKey | NounTypeKey[],
  extra: string[] = [],
  drawnNoun = '',
): boolean {
  const expected = Array.isArray(types) ? types : [types]
  const primary = COMPILED[expected[0]!]
  let text = normalizeForMatch(reason)
  const noun = normalizeForMatch(drawnNoun)
  if (noun) text = text.split(noun).join('')
  for (const name of NAME_ONLY) text = text.split(name).join('')
  if (!text) return false

  if (primary.forbidden.some((f) => containsUnnegated(text, f))) return false

  const stuffed = TYPE_KEYS.filter(
    (k) => !expected.includes(k) && COMPILED[k].keywords.some((w) => containsUnnegated(text, w)),
  ).length
  if (stuffed >= 3) return false // listing words of every type is not an explanation

  const wanted = new Set([...expected.flatMap((k) => COMPILED[k].keywords), ...extra.map(normalizeForMatch)])
  const hits = [...wanted].filter((w) => w && containsUnnegated(text, w))
  return hits.length >= primary.reasonMin
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

/**
 * 0.5 for naming the right noun type + 0.5 for a reason containing the rubric's keywords.
 * Students put things in odd places, so three readings are tried and the best one counts:
 *  A the type box holds the type and the reason box the reason (the normal case; leftover words in the type
 *    box still count as reasoning, e.g. "สามานยนาม ไม่เจาะจง"),
 *  B the two boxes swapped,
 *  C both written together in either box.
 */
export function gradeWord(digit: number, answer: { word: string; reason: string }, opts: { reveal: boolean }): WordGrade {
  const rubric = DIGIT_RUBRIC[digit]
  if (!rubric || rubric.type === null) throw new MissingAnswerKeyError(`no answer key for digit ${digit}`)
  const expected = [rubric.type, ...(rubric.alsoAccept ?? [])]
  const type = NOUN_TYPES[rubric.type]
  const noun = drawnNounFor(digit)

  const read = (typeText: string, reasonText: string) => {
    const t = readType(typeText)
    const [only] = t.types
    const typeOk = t.types.size === 1 && only !== undefined && expected.includes(only)
    const reasonOk = reasonHasKeywords(`${reasonText} ${t.residue}`, expected, rubric.extraKeywords, noun)
    return { typeOk, reasonOk, points: (typeOk ? 0.5 : 0) + (reasonOk ? 0.5 : 0) }
  }
  const both = `${answer.word} ${answer.reason}`
  const candidates = [read(answer.word, answer.reason), read(answer.reason, answer.word), read(both, both)]
  const best = candidates.reduce((a, b) => (b.points > a.points ? b : a))
  const { typeOk, reasonOk, points } = best

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
