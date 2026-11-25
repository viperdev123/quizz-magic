import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GradingPanel from '../src/components/GradingPanel.vue'
import type { SubmissionRow } from '../src/lib/teacher'

const submission: SubmissionRow = {
  id: 's1',
  level: 'ม.1',
  room: 2,
  student_no: 12,
  student_name: 'พิมพ์ชนก ใจดี',
  digits: [2, 5, 7, 9],
  drawn_nouns: ['แมว', 'โรงเรียน', 'ดินสอ', 'ความสุข'],
  words: [
    { word: 'แมว', reason: 'ก' },
    { word: 'โรงเรียน', reason: 'ข' },
    { word: 'ดินสอ', reason: 'ค' },
    { word: 'วิ่ง', reason: 'ง' },
  ],
  submitted_at: '2026-11-25T02:42:00Z',
  updated_at: '2026-11-25T02:42:00Z',
  grades: null,
}

const radios = (w: ReturnType<typeof mount>, group: number, which: 0 | 1) =>
  w.findAll('[role="radiogroup"]')[group]!.findAll('[role="radio"]')[which]!

describe('GradingPanel', () => {
  it('starts with nothing pre-selected', () => {
    const w = mount(GradingPanel, { props: { submission } })
    expect(w.findAll('[role="radio"]').every((r) => r.attributes('aria-checked') === 'false')).toBe(true)
  })

  it('blocks saving until all four marks are chosen', async () => {
    const w = mount(GradingPanel, { props: { submission } })
    await radios(w, 0, 0).trigger('click')
    await radios(w, 1, 0).trigger('click')
    await radios(w, 2, 1).trigger('click')
    await w.findAll('button').find((b) => b.text() === 'บันทึกคะแนน')!.trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.text()).toContain('เลือก ถูก หรือ ไม่ถูก ให้ครบทั้ง 4 คำ')
  })

  it('emits marks, comments and note; total equals the number of correct words', async () => {
    const w = mount(GradingPanel, { props: { submission } })
    await radios(w, 0, 0).trigger('click')
    await radios(w, 1, 0).trigger('click')
    await radios(w, 2, 0).trigger('click')
    await radios(w, 3, 1).trigger('click')
    expect(w.text()).toContain('3')
    await w.find('input[aria-label="ความเห็นของคำที่ 4"]').setValue('ลองอีกครั้งนะ')
    await w.find('input[placeholder^="ความเห็นรวม"]').setValue('เก่งมาก')
    await w.findAll('button').find((b) => b.text() === 'บันทึกแล้วไปคนถัดไป')!.trigger('click')
    expect(w.emitted('save')![0]).toEqual([
      { marks: [true, true, true, false], comments: ['', '', '', 'ลองอีกครั้งนะ'], note: 'เก่งมาก' },
      true,
    ])
  })

  it('loads the existing grade when re-grading', () => {
    const graded = {
      ...submission,
      grades: { marks: [true, false, true, true], comments: ['', 'x', '', ''], note: 'n', total: 3, graded_at: '2026-11-25T03:00:00Z' },
    }
    const w = mount(GradingPanel, { props: { submission: graded } })
    expect(radios(w, 1, 1).attributes('aria-checked')).toBe('true')
    expect(radios(w, 0, 0).attributes('aria-checked')).toBe('true')
    expect((w.find('input[aria-label="ความเห็นของคำที่ 2"]').element as HTMLInputElement).value).toBe('x')
  })

  it('renders student text as plain text, never HTML', () => {
    const evil = { ...submission, student_name: '<img src=x onerror=alert(1)>', words: submission.words.map((x) => ({ ...x, reason: '<b>bold</b>' })) }
    const w = mount(GradingPanel, { props: { submission: evil } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('article b').exists()).toBe(false)
    expect(w.text()).toContain('<img src=x onerror=alert(1)>')
  })
})
