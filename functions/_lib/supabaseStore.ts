import { createClient } from '@supabase/supabase-js'
import type { ScoreStore, StoredSubmission, SubmitStore } from './handlers'

/** Service-role client. The key lives only in Cloudflare secrets and never reaches the browser. */
export function createStores(url: string, serviceKey: string): { submit: SubmitStore; score: ScoreStore } {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const submit: SubmitStore = {
    async submit(a) {
      const { data, error } = await sb.rpc('submit_worksheet', {
        p_level: a.level,
        p_room: a.room,
        p_student_no: a.studentNo,
        p_name: a.name,
        p_name_norm: a.nameNorm,
        p_digits: a.digits,
        p_nouns: a.drawnNouns,
        p_words: a.words,
      })
      if (error) throw new Error('db')
      if (data === 'ok' || data === 'locked' || data === 'mismatch') return data
      throw new Error('db')
    },
  }

  const score: ScoreStore = {
    async find(level, room, studentNo) {
      const { data, error } = await sb
        .from('submissions')
        .select(
          'student_name, level, room, student_no, submitted_at, digits, drawn_nouns, words, grades(marks, comments, note, total)',
        )
        .eq('level', level)
        .eq('room', room)
        .eq('student_no', studentNo)
        .maybeSingle()
      if (error) throw new Error('db')
      if (!data) return null
      const { grades, ...rest } = data as unknown as Omit<StoredSubmission, 'grade'> & {
        grades: StoredSubmission['grade'] | StoredSubmission['grade'][] | null
      }
      const grade = Array.isArray(grades) ? (grades[0] ?? null) : grades
      return { ...rest, grade }
    },
  }

  return { submit, score }
}
