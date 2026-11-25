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
  await page.getByRole('button', { name: 'ลองกรอกเลขตัวอย่าง' }).click()
  // the fixed words appear by themselves under the digits 2 5 7 9
  for (const w of ['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง']) await expect(page.getByText(w).first()).toBeVisible()
  // the student's own work: the noun type and the reason for each word
  const types = ['วิสามานยนาม', 'วิสามานยนาม', 'ลักษณนาม', 'สามานยนาม']
  for (let i = 0; i < 4; i++) {
    await page.getByLabel(`คำที่ ${i + 1} :`, { exact: true }).fill(types[i]!)
    await page.getByPlaceholder('เพราะว่า...').nth(i).fill('เหตุผลทดสอบ')
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

test('flow 1: student submits a worksheet', async ({ page }) => {
  await submitWorksheet(page)
  await expect(page.getByRole('heading', { name: 'ส่งคำตอบเรียบร้อย!' })).toBeVisible()
  await expect(page.getByText('ส่งแล้ว 4 คำ · เลขที่ได้ ๒ ๕ ๗ ๙')).toBeVisible()
  const { data } = await t.admin.from('submissions').select('student_name, digits, drawn_nouns').match(SEAT).single()
  const row = data as { student_name: string; digits: number[]; drawn_nouns: string[] }
  expect(row.student_name).toBe(NAME)
  expect(row.digits).toEqual([2, 5, 7, 9])
  expect(row.drawn_nouns).toEqual(['สุนทรภู่', 'เชียงใหม่', 'รถคันที่สาม', 'อกร่อง']) // derived by the server from the digits
})

test('student sees "waiting for teacher" before grading', async ({ page }) => {
  await lookupScore(page)
  await expect(page.getByRole('heading', { name: 'รอครูตรวจ' })).toBeVisible()
  await expect(page.getByText(NAME)).toBeVisible()
})

test('flow 2: teacher grades the work (all four marks required)', async ({ page }) => {
  await loginTeacher(page)
  await page.getByLabel('ค้นหาชื่อหรือเลขที่').fill('อีทูอี')
  await page.getByRole('button', { name: new RegExp(NAME) }).click()

  // saving without choosing is blocked
  await page.getByRole('button', { name: 'บันทึกคะแนน', exact: true }).click()
  await expect(page.getByText('เลือก ถูก หรือ ไม่ถูก ให้ครบทั้ง 4 คำก่อนบันทึกนะ')).toBeVisible()

  for (const n of [1, 2, 3]) {
    await page.getByRole('radiogroup', { name: `ผลตรวจคำที่ ${n}` }).getByRole('radio', { name: /ถูก \(1\)/ }).click()
  }
  await page.getByRole('radiogroup', { name: 'ผลตรวจคำที่ 4' }).getByRole('radio', { name: /ไม่ถูก/ }).click()
  await page.getByLabel('ความเห็นของคำที่ 4').fill('ลองอีกนิดนะ')
  await page.getByPlaceholder('ความเห็นรวมถึงนักเรียน (ไม่บังคับ)').fill('เก่งมาก')
  await page.screenshot({ path: 'test-results/screens/teacher-grading.png', fullPage: true })
  await page.getByRole('button', { name: 'บันทึกคะแนน', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'บันทึกคะแนนเรียบร้อย' })).toBeVisible()

  const sub = await t.admin.from('submissions').select('id').match(SEAT).single()
  const { data } = await t.admin.from('grades').select('total, marks').eq('submission_id', (sub.data as { id: string }).id).single()
  expect((data as { total: number }).total).toBe(3)
  expect((data as { marks: boolean[] }).marks).toEqual([true, true, true, false])
})

test('flow 3: student checks the score', async ({ page }) => {
  await lookupScore(page)
  await expect(page.getByText('3 / 4')).toBeVisible()
  await expect(page.getByText('เยี่ยมมาก! เรียนรู้ต่อไปนะ')).toBeVisible()
  await expect(page.getByText('ลองอีกนิดนะ').first()).toBeVisible()
  await expect(page.getByText('เก่งมาก')).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/score-graded.png', fullPage: true })
})

test('after grading, resubmitting is locked (rule 2)', async ({ page }) => {
  await submitWorksheet(page)
  await expect(page.getByText('ครูตรวจงานของคุณแล้ว จึงส่งใหม่ไม่ได้')).toBeVisible()
})

test('teacher exports a CSV that Excel can open (BOM) with student data', async ({ page }) => {
  await loginTeacher(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'ดาวน์โหลดคะแนน (CSV)' }).click(),
  ])
  const text = await readFile(await download.path(), 'utf8')
  expect(text.charCodeAt(0)).toBe(0xfeff)
  expect(text).toContain('ชั้น,เลขที่,ชื่อ,เลขที่ได้,คำนามที่สุ่มได้,คำ1,คำ2,คำ3,คำ4,คะแนน,ความเห็นรวม')
  expect(text).toContain(NAME)
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
  test('teacher page', async ({ page }) => {
    // self-sufficient: make sure the seat has a submission even when this test runs alone ('locked' is fine)
    await t.admin.rpc('submit_worksheet', {
      p_level: SEAT.level, p_room: SEAT.room, p_student_no: SEAT.student_no, p_name: NAME, p_name_norm: NAME,
      p_digits: [2, 5, 7, 9], p_nouns: ['a', 'b', 'c', 'd'], p_words: [1, 2, 3, 4].map((n) => ({ word: `w${n}`, reason: `r${n}` })),
    })
    await loginTeacher(page)
    await page.getByRole('button', { name: new RegExp(NAME) }).click()
    expect(await scan(page)).toEqual([])
  })
})
