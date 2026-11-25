import type { RealtimeChannel } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSupabase } from '@/lib/supabase'
import { computeStats, type GradeRow, type SubmissionRow } from '@/lib/teacher'

const COLUMNS =
  'id, level, room, student_no, student_name, digits, drawn_nouns, words, submitted_at, updated_at, grades(marks, comments, note, total, graded_at)'
const POLL_MS = 30_000

type Raw = Omit<SubmissionRow, 'grades'> & { grades: GradeRow | GradeRow[] | null }
const normalize = (r: Raw): SubmissionRow => ({
  ...r,
  grades: Array.isArray(r.grades) ? (r.grades[0] ?? null) : r.grades,
})

export type SaveResult = 'ok' | 'stale' | 'error'

export const useSubmissionsStore = defineStore('submissions', () => {
  const rows = ref<SubmissionRow[]>([])
  const loading = ref(false)
  const error = ref('')
  const realtimeOk = ref(false)
  const stats = computed(() => computeStats(rows.value))

  let channel: RealtimeChannel | null = null
  let debounce: ReturnType<typeof setTimeout> | undefined
  let poll: ReturnType<typeof setInterval> | undefined

  async function fetchAll(silent = false) {
    if (!silent) loading.value = true
    const { data, error: e } = await getSupabase()
      .from('submissions')
      .select(COLUMNS)
      .order('submitted_at', { ascending: true })
      .range(0, 999)
    if (e) {
      error.value = 'โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง'
    } else {
      error.value = ''
      rows.value = (data as unknown as Raw[]).map(normalize)
    }
    loading.value = false
  }

  function scheduleRefetch() {
    clearTimeout(debounce)
    debounce = setTimeout(() => void fetchAll(true), 300)
  }
  function onFocus() {
    if (document.visibilityState === 'visible') void fetchAll(true)
  }
  function startPolling() {
    if (!poll) poll = setInterval(() => void fetchAll(true), POLL_MS)
  }
  function stopPolling() {
    clearInterval(poll)
    poll = undefined
  }

  /** Live updates via Realtime; if it fails we fall back to refetch on focus + slow polling. */
  function start() {
    void fetchAll()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    try {
      channel = getSupabase()
        .channel('teacher-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, scheduleRefetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, scheduleRefetch)
        .subscribe((status) => {
          realtimeOk.value = status === 'SUBSCRIBED'
          if (realtimeOk.value) stopPolling()
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling()
        })
    } catch {
      startPolling()
    }
  }

  function stop() {
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onFocus)
    clearTimeout(debounce)
    stopPolling()
    if (channel) void getSupabase().removeChannel(channel)
    channel = null
    realtimeOk.value = false
  }

  /**
   * Save (or replace) a grade. The total is derived by the database trigger from `marks`.
   * Refuses when the student re-submitted after the teacher opened the work (stale content).
   */
  async function saveGrade(
    submissionId: string,
    shownUpdatedAt: string,
    g: { marks: boolean[]; comments: string[]; note: string },
  ): Promise<SaveResult> {
    const sb = getSupabase()
    const { data: cur, error: ce } = await sb.from('submissions').select('updated_at').eq('id', submissionId).maybeSingle()
    if (ce) return 'error'
    if (!cur || new Date((cur as { updated_at: string }).updated_at).getTime() !== new Date(shownUpdatedAt).getTime()) {
      await fetchAll(true)
      return 'stale'
    }
    const { error: e } = await sb
      .from('grades')
      .upsert(
        { submission_id: submissionId, marks: g.marks, comments: g.comments, note: g.note.trim() || null },
        { onConflict: 'submission_id' },
      )
    if (e) return 'error'
    await fetchAll(true)
    return 'ok'
  }

  return { rows, loading, error, realtimeOk, stats, fetchAll, start, stop, saveGrade }
})
