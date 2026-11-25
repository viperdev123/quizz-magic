import { LEVELS } from '@shared/constants'
import { toArabicDigits } from '@shared/drawn'
import { normalizeName } from '@shared/normalize'
import { thaiCollator } from './format'

export interface GradeRow {
  type_ok: boolean[]
  reason_ok: boolean[]
  comments: string[]
  note: string | null
  total: number // 0 - 4 in half points
  graded_at: string
  /** null = graded automatically by the server; set = last saved by this teacher */
  graded_by: string | null
}
export interface SubmissionRow {
  id: string
  level: string
  room: number
  student_no: number
  student_name: string
  digits: number[]
  drawn_nouns: string[]
  words: { word: string; reason: string }[]
  submitted_at: string
  updated_at: string
  grades: GradeRow | null
}

export type StatusFilter = 'all' | 'waiting' | 'graded'
export interface Filters {
  status: StatusFilter
  level: string // '' = every level
  room: string // '' = every room
  q: string
  sort: 'seat' | 'name'
}

const levelIndex = (l: string) => LEVELS.indexOf(l as (typeof LEVELS)[number])

export function sortRows(rows: SubmissionRow[], sort: Filters['sort']): SubmissionRow[] {
  const bySeat = (a: SubmissionRow, b: SubmissionRow) =>
    levelIndex(a.level) - levelIndex(b.level) || a.room - b.room || a.student_no - b.student_no
  return [...rows].sort(
    sort === 'name' ? (a, b) => thaiCollator.compare(a.student_name, b.student_name) || bySeat(a, b) : bySeat,
  )
}

export function filterRows(rows: SubmissionRow[], f: Filters): SubmissionRow[] {
  const q = normalizeName(toArabicDigits(f.q)) // a number may be searched in Thai or Arabic digits
  const kept = rows.filter((r) => {
    if (f.status === 'waiting' && r.grades) return false
    if (f.status === 'graded' && !r.grades) return false
    if (f.level && r.level !== f.level) return false
    if (f.room && String(r.room) !== f.room) return false
    if (q && !(normalizeName(r.student_name).includes(q) || String(r.student_no) === q)) return false
    return true
  })
  return sortRows(kept, f.sort)
}

export function computeStats(rows: SubmissionRow[]): { submitted: number; graded: number; average: number | null } {
  const graded = rows.filter((r) => r.grades)
  const sum = graded.reduce((s, r) => s + (r.grades?.total ?? 0), 0)
  return {
    submitted: rows.length,
    graded: graded.length,
    average: graded.length ? Math.round((sum / graded.length) * 10) / 10 : null,
  }
}

/** The next ungraded submission after `currentId` in the given (already filtered+sorted) list, wrapping around. */
export function nextUngraded(list: SubmissionRow[], currentId: string | null): SubmissionRow | null {
  if (!list.length) return null
  const start = currentId ? list.findIndex((r) => r.id === currentId) : -1
  for (let step = 1; step <= list.length; step++) {
    const r = list[(start + step + list.length) % list.length]!
    if (!r.grades && r.id !== currentId) return r
  }
  return null
}

export const seatLabel = (r: Pick<SubmissionRow, 'level' | 'room'>) => `${r.level}/${r.room}`
