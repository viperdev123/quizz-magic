// Demo data for LOCAL development only.
// Refuses to run unless SUPABASE_URL points at this machine, so it can never touch a real project.
//   pnpm seed:demo            (uses .dev.vars)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

globalThis.WebSocket ??= class {}

const vars = Object.fromEntries(
  readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
)

const host = new URL(vars.SUPABASE_URL).hostname
if (!['127.0.0.1', 'localhost'].includes(host)) {
  console.error(`Refusing to seed: SUPABASE_URL host is "${host}", not a local Supabase. Demo data is for local development only.`)
  process.exit(1)
}

const sb = createClient(vars.SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const words = (a) => a.map(([word, reason]) => ({ word, reason }))
const rows = [
  ['พิมพ์ชนก ใจดี', 12, [2, 5, 7, 9], ['แมว', 'โรงเรียน', 'ดินสอ', 'ความสุข'], words([['แมว', 'ใช้เรียกชื่อสัตว์'], ['โรงเรียน', 'ใช้เรียกชื่อสถานที่'], ['ดินสอ', 'ใช้เรียกชื่อสิ่งของ'], ['วิ่ง', 'เป็นการกระทำของคน']])],
  ['ธนกร รักเรียน', 13, [1, 3, 4, 8], ['ช้าง', 'สวน', 'ปากกา', 'ความดี'], words([['ช้าง', 'เป็นสัตว์'], ['สวน', 'เป็นสถานที่'], ['ปากกา', 'เป็นสิ่งของ'], ['ความดี', 'เป็นนามธรรม']])],
  ['ณัฐชา แสงดาว', 14, [0, 6, 2, 5], ['ปลา', 'ตลาด', 'โต๊ะ', 'ความรัก'], words([['ปลา', 'เป็นสัตว์'], ['ตลาด', 'เป็นสถานที่'], ['โต๊ะ', 'เป็นสิ่งของ'], ['ความรัก', 'เป็นความรู้สึก']])],
]

const { error } = await sb.from('submissions').upsert(
  rows.map(([name, no, digits, nouns, w]) => ({
    level: 'ม.1', room: 2, student_no: no, student_name: name, name_norm: name.toLowerCase(),
    digits, drawn_nouns: nouns, words: w,
  })),
  { onConflict: 'level,room,student_no' },
)
console.log(error ? `Seed failed: ${error.message}` : `Seeded ${rows.length} demo submissions (ม.1/2).`)
process.exit(error ? 1 : 0)
