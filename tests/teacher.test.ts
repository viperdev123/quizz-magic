import { describe, expect, it } from 'vitest'
import { buildCsv, csvCell, CSV_HEADERS } from '../src/lib/csv'
import {
  computeStats,
  filterRows,
  nextUngraded,
  type Filters,
  type GradeRow,
  type SubmissionRow,
} from '../src/lib/teacher'

const grade = (total: number, note: string | null = null): GradeRow => ({
  marks: [total > 0, total > 1, total > 2, total > 3],
  comments: ['', '', '', ''],
  note,
  total,
  graded_at: '2026-11-25T03:00:00Z',
})
const row = (over: Partial<SubmissionRow> & Pick<SubmissionRow, 'id' | 'student_name'>): SubmissionRow => ({
  level: 'ม.1',
  room: 2,
  student_no: 1,
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
  ...over,
})
const rows: SubmissionRow[] = [
  row({ id: 'a', student_name: 'พิมพ์ชนก ใจดี', student_no: 12 }),
  row({ id: 'b', student_name: 'ธนกร รักเรียน', student_no: 13 }),
  row({ id: 'c', student_name: 'ณัฐชา แสงดาว', student_no: 14, grades: grade(3) }),
  row({ id: 'd', student_name: 'Somchai Smith', student_no: 15, grades: grade(4) }),
  row({ id: 'e', student_name: 'อริสา ตั้งใจ', level: 'ม.2', room: 1, student_no: 1 }),
]
const base: Filters = { status: 'all', level: '', room: '', q: '', sort: 'seat' }

describe('stats', () => {
  it('counts submitted, graded and averages out of 4', () => {
    expect(computeStats(rows)).toEqual({ submitted: 5, graded: 2, average: 3.5 })
  })
  it('average is null when nothing is graded', () => {
    expect(computeStats([rows[0]!]).average).toBeNull()
  })
})

describe('filters', () => {
  it('filters by status', () => {
    expect(filterRows(rows, { ...base, status: 'waiting' }).map((r) => r.id)).toEqual(['a', 'b', 'e'])
    expect(filterRows(rows, { ...base, status: 'graded' }).map((r) => r.id)).toEqual(['c', 'd'])
  })
  it('filters by level and room', () => {
    expect(filterRows(rows, { ...base, level: 'ม.2' }).map((r) => r.id)).toEqual(['e'])
    expect(filterRows(rows, { ...base, level: 'ม.1', room: '2' })).toHaveLength(4)
    expect(filterRows(rows, { ...base, room: '9' })).toHaveLength(0)
  })
  it('searches by Thai name, mixed Latin (case-insensitive) and student number', () => {
    expect(filterRows(rows, { ...base, q: 'ธนกร' }).map((r) => r.id)).toEqual(['b'])
    expect(filterRows(rows, { ...base, q: 'SOMCHAI' }).map((r) => r.id)).toEqual(['d'])
    expect(filterRows(rows, { ...base, q: '14' }).map((r) => r.id)).toEqual(['c'])
  })
  it('sorts by seat by default and by Thai collation on request', () => {
    expect(filterRows(rows, base).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    const names = filterRows(rows, { ...base, sort: 'name' }).map((r) => r.student_name)
    expect(names.indexOf('ณัฐชา แสงดาว')).toBeLessThan(names.indexOf('ธนกร รักเรียน'))
  })
})

describe('nextUngraded', () => {
  it('returns the next waiting student after the current one', () => {
    expect(nextUngraded(rows, 'a')?.id).toBe('b')
  })
  it('skips graded students and wraps around', () => {
    expect(nextUngraded(rows, 'b')?.id).toBe('e')
    expect(nextUngraded(rows, 'e')?.id).toBe('a')
  })
  it('returns null when nobody else is waiting', () => {
    expect(nextUngraded([rows[2]!, rows[3]!], 'c')).toBeNull()
    expect(nextUngraded([rows[0]!], 'a')).toBeNull()
  })
})

describe('CSV export', () => {
  it('starts with a UTF-8 BOM and the required columns', () => {
    const csv = buildCsv(rows)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n')[0]).toBe(CSV_HEADERS.join(','))
    expect(CSV_HEADERS).toEqual(['ชั้น', 'เลขที่', 'ชื่อ', 'เลขที่ได้', 'คำนามที่สุ่มได้', 'คำ1', 'คำ2', 'คำ3', 'คำ4', 'คะแนน', 'ความเห็นรวม'])
  })
  it('writes one line per student with score only when graded', () => {
    const lines = buildCsv(rows).trim().split('\r\n')
    expect(lines).toHaveLength(6)
    expect(lines[1]).toContain('ม.1/2,12,พิมพ์ชนก ใจดี,2 5 7 9,')
    expect(lines[3]).toMatch(/,3,$/)
  })
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })
  it('neutralises spreadsheet formulas typed by students', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`)
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })
})
