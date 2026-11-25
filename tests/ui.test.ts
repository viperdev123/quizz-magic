import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import DigitBoxes from '../src/components/DigitBoxes.vue'
import { formatThaiDateTime, scoreMessage, thaiCollator } from '../src/lib/format'

// Parent keeps v-model state like the real page does
function mountBoxes() {
  const Host = defineComponent({
    components: { DigitBoxes },
    setup() {
      return { digits: ref(['', '', '', '']), nouns: ref(['', '', '', '']) }
    },
    template: '<DigitBoxes v-model:digits="digits" v-model:nouns="nouns" />',
  })
  const w = mount(Host, { attachTo: document.body })
  const digitInputs = () => w.findAll('input[inputmode="numeric"]')
  return { w, digitInputs, state: () => w.vm as unknown as { digits: string[] } }
}

describe('DigitBoxes', () => {
  it('has aria labels on every box', () => {
    const { digitInputs } = mountBoxes()
    expect(digitInputs()).toHaveLength(4)
    digitInputs().forEach((el) => expect(el.attributes('aria-label')).toMatch(/เลขที่ได้/))
  })

  it('keeps one digit and auto-advances focus', async () => {
    const { digitInputs, state } = mountBoxes()
    const first = digitInputs()[0]!
    ;(first.element as HTMLInputElement).value = '7'
    await first.trigger('input')
    expect(state().digits[0]).toBe('7')
    expect(document.activeElement).toBe(digitInputs()[1]!.element)
  })

  it('ignores non-digits', async () => {
    const { digitInputs, state } = mountBoxes()
    const first = digitInputs()[0]!
    ;(first.element as HTMLInputElement).value = 'ก'
    await first.trigger('input')
    expect(state().digits[0]).toBe('')
  })

  it('Backspace on an empty box clears and returns to the previous box', async () => {
    const { digitInputs, state } = mountBoxes()
    const [a, b] = [digitInputs()[0]!, digitInputs()[1]!]
    ;(a.element as HTMLInputElement).value = '3'
    await a.trigger('input')
    await b.trigger('keydown', { key: 'Backspace' })
    expect(state().digits[0]).toBe('')
    expect(document.activeElement).toBe(a.element)
  })

  it('pastes 4 digits across all boxes', async () => {
    const { digitInputs, state } = mountBoxes()
    await digitInputs()[2]!.trigger('paste', { clipboardData: { getData: () => '2 5-7 9' } })
    expect(state().digits).toEqual(['2', '5', '7', '9'])
  })
})

describe('format helpers', () => {
  it('formats Buddhist-era date and Bangkok time', () => {
    expect(formatThaiDateTime('2026-11-25T02:42:00Z')).toBe('25 พ.ย. 2569 • 09:42 น.')
  })
  it('returns a message for every total', () => {
    for (const t of [0, 1, 2, 3, 4]) expect(scoreMessage(t)).toBeTruthy()
  })
  it('sorts Thai names with the Thai collator', () => {
    const sorted = ['อริสา', 'ธนกร', 'ณัฐชา', 'พิมพ์ชนก'].sort(thaiCollator.compare)
    expect(sorted).toEqual(['ณัฐชา', 'ธนกร', 'พิมพ์ชนก', 'อริสา'])
  })
})
