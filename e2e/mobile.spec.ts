import { devices, expect, test } from '@playwright/test'

// Mobile layout and keyboard behaviour of the digit boxes. No database access.
test.use({ ...devices['Pixel 7'] })

test('submit page: no horizontal scroll, 44px tap targets, visible labels', async ({ page }) => {
  await page.goto('/submit')
  await page.getByRole('navigation', { name: 'เมนูหลัก' }).waitFor()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  const tooSmall = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main button, main input, main select, header a, nav a')]
      .filter((el) => el.offsetParent !== null && !(el as HTMLInputElement).hidden && (el as HTMLInputElement).type !== 'hidden')
      .map((el) => ({ tag: el.tagName, text: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 25), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width }))
      .filter((r) => r.h > 0 && r.h < 44),
  )
  expect(tooSmall).toEqual([])
})

test('digit boxes: auto-advance, Backspace goes back, paste fills all four', async ({ page }) => {
  await page.goto('/submit')
  const boxes = page.getByLabel(/^เลขที่ได้ ช่องที่/)
  await boxes.nth(0).click()
  await page.keyboard.type('2')
  await expect(boxes.nth(1)).toBeFocused()
  await page.keyboard.type('5')
  await page.keyboard.type('7')
  await expect(boxes.nth(3)).toBeFocused()
  await page.keyboard.press('Backspace') // empty box -> previous box cleared and focused
  await expect(boxes.nth(2)).toBeFocused()
  await expect(boxes.nth(2)).toHaveValue('')

  await boxes.nth(0).click()
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const dt = new DataTransfer()
    dt.setData('text', '1 2 3 4')
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  for (const [i, v] of ['๑', '๒', '๓', '๔'].entries()) await expect(boxes.nth(i)).toHaveValue(v) // shown in Thai numerals
})

test('a digit shows its fixed word, with เล่ม / คัน highlighted, and Thai digits are accepted', async ({ page }) => {
  await page.goto('/submit')
  const boxes = page.getByLabel(/^เลขที่ได้ ช่องที่/)
  await boxes.nth(0).click()
  await page.keyboard.type('๓') // Thai digit typed
  await expect(boxes.nth(0)).toHaveValue('๓')
  await page.keyboard.type('7') // Arabic digit typed -> shown in Thai
  await expect(boxes.nth(1)).toHaveValue('๗')
  await expect(page.getByText('หนังสือ ๑')).toBeVisible()
  await expect(page.getByText('รถ', { exact: false }).first()).toBeVisible()
  await expect(page.locator('span.text-bad')).toHaveText(['เล่ม', 'คัน'])
})

test('long Thai and mixed Thai/Latin names do not break the layout', async ({ page }) => {
  await page.goto('/submit')
  await page.getByLabel('ชื่อ-สกุล').fill('เด็กหญิงพิมพ์ชนกพรรณรายวิลาสินีศรีสุวรรณภูมิ Somchai-Jaidee Smith')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
