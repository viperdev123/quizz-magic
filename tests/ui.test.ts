import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import DigitBoxes from '../src/components/DigitBoxes.vue'
import NounText from '../src/components/NounText.vue'
import { formatThaiDateTime, scoreMessage, thaiCollator } from '../src/lib/format'
import { DRAWN_NOUNS, drawnNounFor, nounSegments, toArabicDigits, toThaiDigits } from '../shared/drawn'

// Parent keeps v-model state like the real page does
function mountBoxes() {
  const Host = defineComponent({
    components: { DigitBoxes },
    setup() {
      return { digits: ref(['', '', '', '']) }
    },
    template: '<DigitBoxes v-model:digits="digits" />',
  })
  const w = mount(Host, { attachTo: document.body })
  const digitInputs = () => w.findAll('input[inputmode="numeric"]')
  const type = async (i: number, value: string) => {
    const el = digitInputs()[i]!
    ;(el.element as HTMLInputElement).value = value
    await el.trigger('input')
  }
  return { w, digitInputs, type, state: () => w.vm as unknown as { digits: string[] } }
}

describe('DigitBoxes', () => {
  it('has aria labels on every box and exactly four editable inputs (the words are not inputs)', () => {
    const { w, digitInputs } = mountBoxes()
    expect(digitInputs()).toHaveLength(4)
    expect(w.findAll('input')).toHaveLength(4)
    digitInputs().forEach((el) => expect(el.attributes('aria-label')).toMatch(/เลขที่ได้/))
  })

  it('keeps one digit, shows it in Thai numerals and auto-advances focus', async () => {
    const { digitInputs, type, state } = mountBoxes()
    await type(0, '7')
    expect(state().digits[0]).toBe('7')
    expect((digitInputs()[0]!.element as HTMLInputElement).value).toBe('๗')
    expect(document.activeElement).toBe(digitInputs()[1]!.element)
  })

  it('accepts Thai digits and stores them as Arabic', async () => {
    const { digitInputs, type, state } = mountBoxes()
    await type(0, '๓')
    expect(state().digits[0]).toBe('3')
    expect((digitInputs()[0]!.element as HTMLInputElement).value).toBe('๓')
  })

  it('refuses a digit that is already in another box and says why', async () => {
    const { w, digitInputs, type, state } = mountBoxes()
    await type(0, '5')
    await type(1, '5')
    expect(state().digits[1]).toBe('')
    expect((digitInputs()[1]!.element as HTMLInputElement).value).toBe('')
    expect(w.text()).toContain('เลขซ้ำกันไม่ได้')
    await type(1, '6')
    expect(state().digits[1]).toBe('6')
    expect(w.text()).not.toContain('เลขซ้ำกันไม่ได้')
  })

  it('ignores non-digits', async () => {
    const { type, state } = mountBoxes()
    await type(0, 'ก')
    expect(state().digits[0]).toBe('')
  })

  it('fills in the fixed read-only word under each digit, in order', async () => {
    const { w, type } = mountBoxes()
    await type(0, '0')
    await type(1, '3')
    await type(2, '7')
    await type(3, '9')
    const words = w.findAll('p').map((p) => p.text().replace(/คำนามที่สุ่มได้ใต้เลขช่องที่ \d: /, ''))
    expect(words).toEqual(['มะนาว', 'หนังสือ ๑ เล่ม', 'รถคันที่สาม', 'อกร่อง'])
  })

  it('shows the placeholder until a digit is entered and updates when the digit changes', async () => {
    const { w, type } = mountBoxes()
    expect(w.findAll('p')[0]!.text()).toContain('คำนามที่สุ่มได้')
    await type(0, '1')
    expect(w.findAll('p')[0]!.text()).toContain('ความรัก')
    await type(0, '4')
    expect(w.findAll('p')[0]!.text()).toContain('นักเรียน')
  })

  it('highlights เล่ม (digit 3) and คัน (digit 7) in red', async () => {
    const { w, type } = mountBoxes()
    await type(1, '3')
    await type(2, '7')
    const red = w.findAll('span.text-bad').map((s) => s.text())
    expect(red).toEqual(['เล่ม', 'คัน'])
  })

  it('Backspace on an empty box clears and returns to the previous box', async () => {
    const { digitInputs, type, state } = mountBoxes()
    await type(0, '3')
    await digitInputs()[1]!.trigger('keydown', { key: 'Backspace' })
    expect(state().digits[0]).toBe('')
    expect(document.activeElement).toBe(digitInputs()[0]!.element)
  })

  it('pastes 4 digits (Arabic or Thai) across all boxes', async () => {
    const { digitInputs, state } = mountBoxes()
    await digitInputs()[2]!.trigger('paste', { clipboardData: { getData: () => '2 5-7 9' } })
    expect(state().digits).toEqual(['2', '5', '7', '9'])
    await digitInputs()[0]!.trigger('paste', { clipboardData: { getData: () => '๑๒๓๔' } })
    expect(state().digits).toEqual(['1', '2', '3', '4'])
  })
})

describe('drawn words and Thai digits', () => {
  it('has the agreed word for every digit 0-9', () => {
    expect([...DRAWN_NOUNS]).toEqual([
      'มะนาว', 'ความรัก', 'สุนทรภู่', 'หนังสือ ๑ เล่ม', 'นักเรียน',
      'เชียงใหม่', 'การนอน', 'รถคันที่สาม', 'การเมือง', 'อกร่อง',
    ])
    expect(drawnNounFor('2')).toBe('สุนทรภู่')
    expect(drawnNounFor(9)).toBe('อกร่อง')
    expect(drawnNounFor('x')).toBe('')
  })
  it('splits only the special nouns into emphasised parts', () => {
    expect(nounSegments('หนังสือ ๑ เล่ม')).toEqual([
      { text: 'หนังสือ ๑ ', emphasis: false },
      { text: 'เล่ม', emphasis: true },
    ])
    expect(nounSegments('รถคันที่สาม')).toEqual([
      { text: 'รถ', emphasis: false },
      { text: 'คัน', emphasis: true },
      { text: 'ที่สาม', emphasis: false },
    ])
    expect(nounSegments('มะนาว')).toEqual([{ text: 'มะนาว', emphasis: false }])
  })
  it('converts digits both ways and leaves other text alone', () => {
    expect(toThaiDigits('0123456789')).toBe('๐๑๒๓๔๕๖๗๘๙')
    expect(toArabicDigits('๐๑๒๓๔๕๖๗๘๙')).toBe('0123456789')
    expect(toThaiDigits('ห้อง 2 เลขที่ 12')).toBe('ห้อง ๒ เลขที่ ๑๒')
    expect(toArabicDigits(toThaiDigits('2579'))).toBe('2579')
  })
  it('NounText renders text only (no HTML injection)', () => {
    const w = mount(NounText, { props: { text: '<img src=x onerror=alert(1)>' } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('format helpers', () => {
  it('formats Buddhist-era date and Bangkok time', () => {
    expect(formatThaiDateTime('2026-11-25T02:42:00Z')).toBe('๒๕ พ.ย. ๒๕๖๙ • ๐๙:๔๒ น.')
  })
  it('returns a message for every total', () => {
    for (const t of [0, 1, 2, 3, 4]) expect(scoreMessage(t)).toBeTruthy()
  })
  it('sorts Thai names with the Thai collator', () => {
    const sorted = ['อริสา', 'ธนกร', 'ณัฐชา', 'พิมพ์ชนก'].sort(thaiCollator.compare)
    expect(sorted).toEqual(['ณัฐชา', 'ธนกร', 'พิมพ์ชนก', 'อริสา'])
  })
})
