// zero-width space/joiners, word joiner, BOM
const ZERO_WIDTH = new RegExp('[\\u200B-\\u200D\\u2060\\uFEFF]', 'g')

/** Normalise a student name for comparison: NFC, no zero-width chars, trimmed, single spaces, lowercase. */
export function normalizeName(input: string): string {
  return input.normalize('NFC').replace(ZERO_WIDTH, '').replace(/\s+/g, ' ').trim().toLowerCase()
}
