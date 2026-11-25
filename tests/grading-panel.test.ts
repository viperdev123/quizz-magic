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
  drawn_nouns: ['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง'],
  words: [
    { word: 'วิสามานยนาม', reason: 'เป็นชื่อเฉพาะของบุคคล' },
    { word: 'วิสามานยนาม', reason: 'เป็นชื่อจังหวัด' },
    { word: 'ลักษณนาม', reason: 'คำว่าคันใช้นับรถ' },
    { word: 'สามานยนาม', reason: 'เป็นชื่อเรียกทั่วไป' },
  ],
  submitted_at: '2026-11-25T02:42:00Z',
  updated_at: '2026-11-25T02:42:00Z',
  grades: null,
}

type Wrapper = ReturnType<typeof mount>
// two toggles per word: [word 1 type, word 1 reason, word 2 type, ...]
const toggle = (w: Wrapper, word: number, part: 'type' | 'reason', which: 0 | 1) =>
  w.findAll('[role="radiogroup"]')[word * 2 + (part === 'type' ? 0 : 1)]!.findAll('[role="radio"]')[which]!
const clickAll = async (w: Wrapper, mark: 0 | 1) => {
  for (let i = 0; i < 4; i++) {
    await toggle(w, i, 'type', mark).trigger('click')
    await toggle(w, i, 'reason', mark).trigger('click')
  }
}
const button = (w: Wrapper, name: string) => w.findAll('button').find((b) => b.text() === name)!

describe('GradingPanel (teacher override of the automatic grade)', () => {
  it('has a noun-type toggle and a reason toggle for every word', () => {
    const w = mount(GradingPanel, { props: { submission } })
    expect(w.findAll('[role="radiogroup"]')).toHaveLength(8)
    expect(w.text()).toContain('ชนิดคำนาม (0.5 คะแนน)')
    expect(w.text()).toContain('เหตุผล (0.5 คะแนน)')
  })

  it('starts with nothing chosen for an ungraded submission', () => {
    const w = mount(GradingPanel, { props: { submission } })
    expect(w.findAll('[role="radio"]').every((r) => r.attributes('aria-checked') === 'false')).toBe(true)
  })

  it('blocks saving until every half is chosen', async () => {
    const w = mount(GradingPanel, { props: { submission } })
    await toggle(w, 0, 'type', 0).trigger('click')
    await toggle(w, 0, 'reason', 0).trigger('click')
    await button(w, 'บันทึกคะแนน').trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.text()).toContain('เลือก ถูก หรือ ไม่ถูก ให้ครบ')
  })

  it('emits both arrays; the total moves in half points', async () => {
    const w = mount(GradingPanel, { props: { submission } })
    await clickAll(w, 0) // everything correct
    expect(w.text()).toContain('4')
    await toggle(w, 3, 'reason', 1).trigger('click') // last reason wrong -> 3.5
    expect(w.text()).toContain('3.5')
    await w.find('input[aria-label="ความเห็นของคำที่ 4"]').setValue('ลองอีกครั้งนะ')
    await w.find('input[placeholder^="ความเห็นรวม"]').setValue('เก่งมาก')
    await button(w, 'บันทึกแล้วไปคนถัดไป').trigger('click')
    expect(w.emitted('save')![0]).toEqual([
      {
        typeOk: [true, true, true, true],
        reasonOk: [true, true, true, false],
        comments: ['', '', '', 'ลองอีกครั้งนะ'],
        note: 'เก่งมาก',
      },
      true,
    ])
  })

  it('loads the automatic grade so the teacher only has to fix what is wrong', () => {
    const graded = {
      ...submission,
      grades: {
        type_ok: [true, true, true, false],
        reason_ok: [true, false, true, false],
        comments: ['ถูกต้องเลย', 'x', '', ''],
        note: 'n',
        total: 2.5,
        graded_at: '2026-11-25T03:00:00Z',
        graded_by: null,
      },
    }
    const w = mount(GradingPanel, { props: { submission: graded } })
    expect(toggle(w, 1, 'reason', 1).attributes('aria-checked')).toBe('true') // wrong
    expect(toggle(w, 1, 'type', 0).attributes('aria-checked')).toBe('true') // right
    expect((w.find('input[aria-label="ความเห็นของคำที่ 2"]').element as HTMLInputElement).value).toBe('x')
    expect(w.text()).toContain('ตรวจอัตโนมัติ')
    expect(w.text()).toContain('2.5/4')
  })

  it('says when a teacher has already changed the grade', () => {
    const edited = {
      ...submission,
      grades: { type_ok: [true, true, true, true], reason_ok: [true, true, true, true], comments: ['', '', '', ''], note: null, total: 4, graded_at: '2026-11-25T03:00:00Z', graded_by: 'teacher-1' },
    }
    expect(mount(GradingPanel, { props: { submission: edited } }).text()).toContain('ครูแก้คะแนนแล้ว')
  })

  it('renders student text as plain text, never HTML', () => {
    const evil = { ...submission, student_name: '<img src=x onerror=alert(1)>', words: submission.words.map((x) => ({ ...x, reason: '<b>bold</b>' })) }
    const w = mount(GradingPanel, { props: { submission: evil } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('article b').exists()).toBe(false)
    expect(w.text()).toContain('<img src=x onerror=alert(1)>')
  })
})
