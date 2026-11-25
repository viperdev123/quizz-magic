import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { SEAT, setup, teardown, type TempTeacher } from './db'

test.describe.configure({ mode: 'serial' })

const NAME = 'ผู้ทดสอบ อีทูอี'
let t: TempTeacher

test.beforeAll(async () => {
  t = await setup()
})
test.afterAll(async () => {
  if (t) await teardown(t)
})

// Digits 2 5 7 9 -> สุนทรภู่ (วิสามานยนาม), เชียงใหม่ (วิสามานยนาม), รถคันที่สาม (ลักษณนาม), อกร่อง (สามานยนาม).
// The last answer is deliberately wrong (a proper-noun answer for a common noun): 1 + 1 + 1 + 0 = 3.
const ANSWERS = [
  ['วิสามานยนาม', 'เป็นชื่อเฉพาะของบุคคล'],
  ['วิสามานยนาม', 'เป็นชื่อจังหวัด'],
  ['ลักษณนาม', 'คำว่าคันใช้นับรถ'],
  ['วิสามานยนาม', 'เป็นชื่อเฉพาะ'],
] as const

async function waitForTurnstile(page: Page) {
  // Cloudflare's test site key solves itself; the widget writes the token into a hidden input.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 45_000 })
}
async function fillSeat(page: Page) {
  await page.getByRole('combobox', { name: /^ชั้น/ }).selectOption(SEAT.level)
  await page.getByLabel('ห้อง', { exact: true }).fill(String(SEAT.room))
  await page.getByLabel('เลขที่', { exact: true }).fill(String(SEAT.student_no))
}
async function submitWorksheet(page: Page) {
  await page.goto('/submit')
  await page.getByLabel('ชื่อ-สกุล').fill(NAME)
  await fillSeat(page)
  // type the four digits: each box moves on to the next by itself
  await page.getByLabel(/^เลขที่ได้ ช่องที่/).first().click()
  await page.keyboard.type('2579')
  // the fixed words appear by themselves under the digits
  for (const w of ['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง']) await expect(page.getByText(w).first()).toBeVisible()
  // the student's own work: the noun type and the reason for each word
  for (let i = 0; i < 4; i++) {
    await page.getByLabel(`คำที่ ${'๑๒๓๔'[i]} :`, { exact: true }).fill(ANSWERS[i]![0])
    await page.getByPlaceholder('เพราะว่า...').nth(i).fill(ANSWERS[i]![1])
  }
  await waitForTurnstile(page)
  await page.getByRole('button', { name: /ส่งคำตอบ/ }).click()
}
async function loginTeacher(page: Page) {
  await page.goto('/teacher/login')
  await page.getByLabel('อีเมล').fill(t.email)
  await page.getByLabel('รหัสผ่าน').fill(t.password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page.getByRole('heading', { name: 'ทุกไอเดีย รอคำแนะนำ' })).toBeVisible()
}
async function lookupScore(page: Page) {
  await page.goto('/score')
  await fillSeat(page)
  await waitForTurnstile(page)
  await page.getByRole('button', { name: 'ดูคะแนน', exact: true }).click()
}

test('flow 1: the student submits and sees the score straight away', async ({ page }) => {
  await submitWorksheet(page)
  await expect(page.getByRole('heading', { name: 'ส่งคำตอบเรียบร้อย!' })).toBeVisible()
  await expect(page.getByText('๓ / ๔')).toBeVisible()
  await expect(page.getByText('เยี่ยมมาก! เรียนรู้ต่อไปนะ')).toBeVisible()
  // the wrong answer (word 4) is marked and the key is shown: it is the only attempt
  await expect(page.getByText(/ชนิดที่ถูกคือ คำนามสามัญ/)).toBeVisible()
  await expect(page.getByText('✓ ชนิดคำนาม (๐.๕)').first()).toBeVisible()
  await expect(page.getByText('✗ ชนิดคำนาม (๐.๕)')).toBeVisible()

  const sub = await t.admin.from('submissions').select('id, student_name, digits, drawn_nouns').match(SEAT).single()
  const row = sub.data as { id: string; student_name: string; digits: number[]; drawn_nouns: string[] }
  expect(row.student_name).toBe(NAME)
  expect(row.digits).toEqual([2, 5, 7, 9])
  expect(row.drawn_nouns).toEqual(['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง']) // derived by the server from the digits
  const g = await t.admin.from('grades').select('total, type_ok, reason_ok, graded_by').eq('submission_id', row.id).single()
  expect(Number((g.data as { total: number }).total)).toBe(3)
  expect((g.data as { type_ok: boolean[] }).type_ok).toEqual([true, true, true, false])
  expect((g.data as { graded_by: string | null }).graded_by).toBeNull() // graded by the server, not a teacher
})

test('one attempt only: submitting again is refused and the score stands', async ({ page }) => {
  await submitWorksheet(page)
  await expect(page.getByText('ส่งงานนี้ไปแล้ว ส่งซ้ำไม่ได้')).toBeVisible()
  const sub = await t.admin.from('submissions').select('id').match(SEAT).single()
  const g = await t.admin.from('grades').select('total').eq('submission_id', (sub.data as { id: string }).id).single()
  expect(Number((g.data as { total: number }).total)).toBe(3)
})

test('flow 2: the teacher sees the automatic grade and can correct a half point', async ({ page }) => {
  await loginTeacher(page)
  await page.getByLabel('ค้นหาชื่อหรือเลขที่').fill('อีทูอี')
  await page.getByRole('button', { name: new RegExp(NAME) }).click()
  await expect(page.getByText(/ตรวจอัตโนมัติ\s+๓\/๔/)).toBeVisible()

  // word 4: the teacher decides the noun type was acceptable after all -> +0.5
  await page.getByRole('radiogroup', { name: 'ชนิดคำนามของคำที่ 4' }).getByRole('radio', { name: /ถูก \(๐\.๕\)/ }).first().click()
  await page.getByLabel('ความเห็นของคำที่ 4').fill('ครูปรับให้ครึ่งคะแนน')
  await page.getByRole('button', { name: 'บันทึกคะแนน', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'บันทึกคะแนนเรียบร้อย' })).toBeVisible()

  const sub = await t.admin.from('submissions').select('id').match(SEAT).single()
  const g = await t.admin.from('grades').select('total, graded_by').eq('submission_id', (sub.data as { id: string }).id).single()
  expect(Number((g.data as { total: number }).total)).toBe(3.5)
  expect((g.data as { graded_by: string | null }).graded_by).toBe(t.userId) // now marked as changed by this teacher
})

test('flow 3: the student looks the score up later and sees the teacher correction', async ({ page }) => {
  await lookupScore(page)
  await expect(page.getByText('๓.๕ / ๔')).toBeVisible()
  await expect(page.getByText('ครูปรับให้ครึ่งคะแนน')).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/score-graded.png', fullPage: true })
})

test('teacher exports a CSV that Excel can open (BOM) with the half-point score', async ({ page }) => {
  await loginTeacher(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'ดาวน์โหลดคะแนน (CSV)' }).click(),
  ])
  const text = await readFile(await download.path(), 'utf8')
  expect(text.charCodeAt(0)).toBe(0xfeff)
  expect(text).toContain('ชั้น,เลขที่,ชื่อ,เลขที่ได้,คำนามที่สุ่มได้,คำ1,คำ2,คำ3,คำ4,คะแนน,ความเห็นรวม')
  expect(text).toContain(NAME)
  expect(text).toMatch(/,3\.5,/)
})

test.describe('accessibility (axe, WCAG 2.x A/AA)', () => {
  const scan = async (page: Page) =>
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
      (v) => `${v.id} [${v.impact}] ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
    )

  test('student pages', async ({ page }) => {
    for (const path of ['/submit', '/score', '/teacher/login']) {
      await page.goto(path)
      await page.getByRole('navigation', { name: 'เมนูหลัก' }).waitFor()
      expect(await scan(page), path).toEqual([])
    }
  })
  test('the score result (half stars, per-half chips, advice boxes)', async ({ page }) => {
    await lookupScore(page)
    await expect(page.getByText('๓.๕ / ๔')).toBeVisible()
    expect(await scan(page)).toEqual([])
  })
  test('teacher page with a graded student open', async ({ page }) => {
    await loginTeacher(page)
    await page.getByRole('button', { name: new RegExp(NAME) }).click()
    expect(await scan(page)).toEqual([])
  })
})
