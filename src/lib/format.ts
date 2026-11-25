const TZ = 'Asia/Bangkok'

/** "25 พ.ย. 2569 • 09:42 น." (Buddhist calendar, Bangkok time) */
export function formatThaiDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  }).format(d)
  const time = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TZ,
  }).format(d)
  return `${date} • ${time} น.`
}

export function scoreMessage(total: number): string {
  if (total >= 4) return 'เก่งมาก! ได้เต็มเลย'
  if (total === 3) return 'เยี่ยมมาก! เรียนรู้ต่อไปนะ'
  if (total === 2) return 'ดีแล้ว! ลองทบทวนอีกนิดนะ'
  if (total === 1) return 'สู้ ๆ! ค่อย ๆ เรียนรู้ไปด้วยกันนะ'
  return 'ไม่เป็นไร! เริ่มใหม่ไปด้วยกันนะ'
}

/** Thai-aware comparison for sorting names */
export const thaiCollator = new Intl.Collator('th')
