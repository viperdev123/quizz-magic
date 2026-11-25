import { seatLabel, sortRows, type SubmissionRow } from './teacher'

export const CSV_HEADERS = [
  'ชั้น',
  'เลขที่',
  'ชื่อ',
  'เลขที่ได้',
  'คำนามที่สุ่มได้',
  'คำ1',
  'คำ2',
  'คำ3',
  'คำ4',
  'คะแนน',
  'ความเห็นรวม',
] as const

/** Quote for CSV and neutralise spreadsheet formulas (students control these strings). */
export function csvCell(value: string | number): string {
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(rows: SubmissionRow[]): string {
  const lines = [CSV_HEADERS.join(',')]
  for (const r of sortRows(rows, 'seat')) {
    lines.push(
      [
        seatLabel(r),
        r.student_no,
        r.student_name,
        r.digits.join(' '),
        r.drawn_nouns.join(' / '),
        ...[0, 1, 2, 3].map((i) => r.words[i]?.word ?? ''),
        r.grades ? r.grades.total : '',
        r.grades?.note ?? '',
      ]
        .map(csvCell)
        .join(','),
    )
  }
  // UTF-8 BOM so Excel opens Thai text correctly; CRLF line endings for Excel.
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function downloadCsv(rows: SubmissionRow[], today = new Date()): void {
  const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `scores-${today.toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
