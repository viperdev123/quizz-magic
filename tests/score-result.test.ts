import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ScoreResultView from '../src/components/ScoreResultView.vue'
import { formatScore, scoreMessage } from '../src/lib/format'
import type { GradedScore, ScoreItem } from '../shared/schemas'

const item = (over: Partial<ScoreItem>): ScoreItem => ({
  digit: 2, drawnNoun: 'สุนทรภู่', word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะ',
  typeOk: true, reasonOk: true, points: 1, comment: null, ...over,
})
const result = (total: number, items: ScoreItem[]): GradedScore => ({
  status: 'graded', name: 'พิมพ์ชนก ใจดี', level: 'ม.1', room: 2, studentNo: 12,
  submittedAt: '2026-11-25T02:42:00Z', total, note: null,
  items: items as GradedScore['items'],
})
const four = (...over: Partial<ScoreItem>[]) => over.map((o) => item(o))

describe('score formatting', () => {
  it('shows whole scores without a decimal and halves with one', () => {
    expect(formatScore(4)).toBe('4')
    expect(formatScore(3.5)).toBe('3.5')
    expect(formatScore(0.5)).toBe('0.5')
    expect(formatScore(0)).toBe('0')
  })
  it('picks the encouragement by range, so half scores are not skipped', () => {
    expect(scoreMessage(4)).toContain('เต็ม')
    expect(scoreMessage(3.5)).toBe(scoreMessage(3))
    expect(scoreMessage(2.5)).toBe(scoreMessage(2))
    expect(scoreMessage(0.5)).toBe(scoreMessage(0.5)) // 0.5 is still below 1
    expect(scoreMessage(0.5)).not.toBe(scoreMessage(1))
  })
})

describe('ScoreResultView', () => {
  const mixed = result(
    2.5,
    four(
      {},
      { typeOk: true, reasonOk: false, points: 0.5, comment: 'ชนิดคำนามถูกแล้ว แต่เหตุผลยังไม่ครบ' },
      { typeOk: false, reasonOk: true, points: 0.5 },
      { typeOk: false, reasonOk: false, points: 0, comment: 'ลองคิดอีกครั้งนะ ชนิดที่ถูกคือ สามานยนาม' },
    ),
  )

  it('shows the total in half points', () => {
    const w = mount(ScoreResultView, { props: { result: mixed } })
    expect(w.text()).toContain('2.5 / 4')
    expect(w.find('[role="img"]').attributes('aria-label')).toBe('ได้ 2.5 จาก 4 คะแนน')
  })
  it('draws 2 full stars and 1 half star for 2.5', () => {
    const w = mount(ScoreResultView, { props: { result: mixed } })
    const stars = w.findAll('p[role="img"] > span')
    expect(stars).toHaveLength(4)
    expect(stars.filter((s) => s.find('span.absolute:not(.overflow-hidden)').exists())).toHaveLength(2) // full
    expect(stars.filter((s) => s.find('span.overflow-hidden').exists())).toHaveLength(1) // half
  })
  it('marks each half of each word: right, half and wrong are told apart', () => {
    const text = mount(ScoreResultView, { props: { result: mixed } }).text()
    expect(text).toContain('✓ 1')
    expect(text).toContain('½ 0.5')
    expect(text).toContain('✗ 0')
    expect(text).toContain('ชนิดคำนาม (0.5)')
    expect(text).toContain('เหตุผล (0.5)')
  })
  it('shows the advice for every word that has one', () => {
    const text = mount(ScoreResultView, { props: { result: mixed } }).text()
    expect(text).toContain('ชนิดคำนามถูกแล้ว แต่เหตุผลยังไม่ครบ')
    expect(text).toContain('ชนิดที่ถูกคือ สามานยนาม')
  })
  it('renders the student text and advice as plain text, never HTML', () => {
    const evil = result(0, four({ word: '<img src=x onerror=alert(1)>', comment: '<b>x</b>', points: 0, typeOk: false, reasonOk: false }, {}, {}, {}))
    const w = mount(ScoreResultView, { props: { result: evil } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('b').exists()).toBe(false)
    expect(w.text()).toContain('<img src=x onerror=alert(1)>')
  })
  it('shows the digit in Thai numerals and the highlighted word', () => {
    const w = mount(ScoreResultView, { props: { result: result(4, four({ digit: 3, drawnNoun: 'หนังสือ ๑ เล่ม' }, {}, {}, {})) } })
    expect(w.text()).toContain('๓')
    expect(w.findAll('span.text-bad').map((s) => s.text())).toContain('เล่ม')
  })
})
