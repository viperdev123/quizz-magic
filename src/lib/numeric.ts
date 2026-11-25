import { toArabicDigits, toThaiDigits } from '@shared/drawn'

/**
 * For a numeric <input>: read what was typed (Thai or Arabic digits), keep only digits, put the Thai numerals
 * back in the box, and return the Arabic digits (what the app stores and sends). Thai numerals are display only.
 */
export function numFrom(e: Event): string {
  const el = e.target as HTMLInputElement
  const digits = toArabicDigits(el.value).replace(/\D/g, '')
  el.value = toThaiDigits(digits)
  return digits
}
