<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import MarkToggle from './MarkToggle.vue'
import NounText from './NounText.vue'
import StatusBadge from './StatusBadge.vue'
import { formatThaiDateTime } from '@/lib/format'
import { toThaiDigits } from '@shared/drawn'
import { seatLabel, type SubmissionRow } from '@/lib/teacher'

const props = defineProps<{ submission: SubmissionRow; saving?: boolean; error?: string }>()
const emit = defineEmits<{
  save: [payload: { marks: boolean[]; comments: string[]; note: string }, goNext: boolean]
}>()

const TONES = ['bg-tint-blue', 'bg-tint-yellow', 'bg-tint-purple', 'bg-tint-green']

const marks = reactive<(boolean | null)[]>([null, null, null, null])
const comments = reactive<string[]>(['', '', '', ''])
const note = ref('')
const tried = ref(false)

// Start from the existing grade when re-grading; otherwise nothing is pre-selected (all 4 marks are required).
watch(
  () => props.submission.id,
  () => {
    const g = props.submission.grades
    for (let i = 0; i < 4; i++) {
      marks[i] = g ? (g.marks[i] ?? null) : null
      comments[i] = g?.comments[i] ?? ''
    }
    note.value = g?.note ?? ''
    tried.value = false
  },
  { immediate: true },
)

const allChosen = computed(() => marks.every((m) => m !== null))
const total = computed(() => marks.filter((m) => m === true).length)

function save(goNext: boolean) {
  tried.value = true
  if (!allChosen.value) return
  emit('save', { marks: marks.map(Boolean), comments: [...comments], note: note.value }, goNext)
}
</script>

<template>
  <section class="rounded-card border border-line/70 bg-white p-5 sm:p-6" :aria-label="`ตรวจงานของ ${submission.student_name}`">
    <StatusBadge :status="submission.grades ? 'graded' : 'waiting'" />
    <h2 class="mt-3 text-2xl font-extrabold">{{ submission.student_name }}</h2>
    <p class="text-ink-soft">{{ seatLabel(submission) }} • เลขที่ {{ submission.student_no }}</p>
    <p class="text-ink-soft">ส่งเมื่อ {{ formatThaiDateTime(submission.submitted_at) }}</p>
    <p v-if="submission.grades" class="mt-2 text-ink-soft">
      ตรวจแล้ว {{ submission.grades.total }}/4 — การบันทึกใหม่จะแทนที่คะแนนเดิม
    </p>

    <ul class="mt-4 flex gap-2" aria-label="เลขที่ได้">
      <li
        v-for="(d, i) in submission.digits"
        :key="i"
        class="grid h-14 w-12 place-items-center rounded-field border-2 border-primary/40 text-2xl font-extrabold text-primary"
      >
        {{ toThaiDigits(String(d)) }}
      </li>
    </ul>

    <div class="mt-5 space-y-4">
      <article v-for="(w, i) in submission.words" :key="i" class="rounded-card p-4 sm:p-5" :class="TONES[i % 4]">
        <p class="font-bold">คำที่ {{ i + 1 }} · เลข {{ toThaiDigits(String(submission.digits[i])) }}</p>
        <p class="text-ink-soft">คำนามที่สุ่มได้: <NounText :text="submission.drawn_nouns[i] ?? ''" /></p>
        <p class="mt-2 text-2xl font-extrabold">{{ w.word }}</p>
        <p class="mt-2">เพราะ {{ w.reason }}</p>
        <div class="mt-3 space-y-3">
          <MarkToggle
            :model-value="marks[i] ?? null"
            :label="`ผลตรวจคำที่ ${i + 1}`"
            :invalid="tried"
            @update:model-value="marks[i] = $event"
          />
          <input
            v-model="comments[i]"
            class="field"
            maxlength="300"
            :aria-label="`ความเห็นของคำที่ ${i + 1}`"
            placeholder="ความเห็นของคำนี้ (ไม่บังคับ)"
          />
        </div>
      </article>
    </div>

    <label class="mt-5 block">
      <span class="mb-2 block text-lg font-bold">ความเห็นรวม</span>
      <input v-model="note" class="field" maxlength="500" placeholder="ความเห็นรวมถึงนักเรียน (ไม่บังคับ)" />
    </label>

    <div class="mt-5 flex items-center justify-between rounded-card bg-tint-yellow px-5 py-4">
      <span class="text-lg font-bold">คะแนน</span>
      <span class="text-3xl font-extrabold" aria-live="polite">
        {{ allChosen ? total : '–' }}<span class="ml-1 text-xl font-semibold text-ink-soft">/ 4</span>
      </span>
    </div>

    <p v-if="tried && !allChosen" role="alert" class="mt-3 rounded-field bg-tint-red px-4 py-3 text-bad">
      เลือก ถูก หรือ ไม่ถูก ให้ครบทั้ง 4 คำก่อนบันทึกนะ
    </p>
    <p v-if="error" role="alert" class="mt-3 rounded-field bg-tint-red px-4 py-3 text-bad">{{ error }}</p>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <button type="button" class="btn-outline" :disabled="saving" @click="save(false)">บันทึกคะแนน</button>
      <button type="button" class="btn-primary" :disabled="saving" @click="save(true)">บันทึกแล้วไปคนถัดไป</button>
    </div>
  </section>
</template>
