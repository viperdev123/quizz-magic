<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DiceMagic from '@/components/DiceMagic.vue'
import DigitBoxes from '@/components/DigitBoxes.vue'
import LottoTicket from '@/components/LottoTicket.vue'
import ScoreResultView from '@/components/ScoreResultView.vue'
import SeatFields from '@/components/SeatFields.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { TURNSTILE_ENABLED } from '@/lib/config'
import WordCard from '@/components/WordCard.vue'
import { submitWorksheet } from '@/lib/api'
import { MESSAGES } from '@shared/constants'
import { SubmitReqSchema, type GradedScore } from '@shared/schemas'

const blankWords = () => Array.from({ length: 4 }, () => ({ word: '', reason: '' }))

const form = reactive({
  name: '',
  level: 'ม.1',
  room: '',
  studentNo: '',
  digits: ['', '', '', ''],
  words: blankWords(),
})
const token = ref('')
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null)
const showInvalid = ref(false)
const sending = ref(false)
const serverError = ref('')
const result = ref<GradedScore | null>(null) // set once the work is submitted and graded

const emptyField = computed(
  () =>
    !form.name.trim() ||
    !form.room ||
    !form.studentNo ||
    form.digits.some((d) => d === '') ||
    form.words.some((w) => !w.word.trim() || !w.reason.trim()),
)

async function submit() {
  serverError.value = ''
  const parsed = SubmitReqSchema.safeParse({
    name: form.name,
    level: form.level,
    room: Number(form.room),
    studentNo: Number(form.studentNo),
    digits: form.digits.map(Number),
    words: form.words,
    turnstileToken: TURNSTILE_ENABLED ? token.value || 'pending' : undefined,
  })
  if (emptyField.value || !parsed.success) {
    showInvalid.value = true
    return
  }
  showInvalid.value = false
  if (TURNSTILE_ENABLED && !token.value) {
    serverError.value = MESSAGES.turnstilePending
    return
  }
  sending.value = true
  const res = await submitWorksheet({ ...parsed.data, turnstileToken: TURNSTILE_ENABLED ? token.value : undefined })
  sending.value = false
  turnstile.value?.reset() // tokens are single-use
  if (res.ok) {
    result.value = res.result
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    serverError.value = res.message
  }
}
</script>

<template>
  <!-- submitted: the score is shown straight away -->
  <section v-if="result" aria-live="polite" class="space-y-6">
    <div class="rounded-card bg-tint-green px-6 py-8 text-center" role="status">
      <div class="mb-4 flex items-center justify-center gap-6 text-primary" aria-hidden="true">
        <span class="text-4xl">✦</span><span class="text-5xl">★</span><span class="text-4xl">✦</span>
      </div>
      <h1 class="text-3xl font-extrabold text-ok sm:text-4xl">ส่งคำตอบเรียบร้อย!</h1>
      <p class="mt-3 text-lg">นี่คือคะแนนของคุณ ส่งงานแล้วส่งใหม่ไม่ได้นะ</p>
    </div>
    <ScoreResultView :result="result" />
  </section>

  <!-- form -->
  <form v-else novalidate class="space-y-8" @submit.prevent="submit">
    <div
      v-if="showInvalid"
      role="alert"
      class="rounded-card bg-tint-red px-6 py-4 text-bad"
    >
      <p class="text-lg font-bold">{{ MESSAGES.invalid }}</p>
      <p class="text-ink-soft">ยังมีช่องว่างอยู่ ลองตรวจดูอีกครั้งนะ</p>
    </div>

    <section class="card p-5 sm:p-6" aria-labelledby="who">
      <h2 id="who" class="mb-4 text-lg font-bold">ก่อนเริ่ม มารู้จักกันหน่อย</h2>
      <div class="grid gap-4 sm:grid-cols-[2fr_3fr]">
        <label class="block">
          <span class="mb-2 block font-semibold">ชื่อ-สกุล</span>
          <input
            v-model="form.name"
            class="field"
            :class="showInvalid && !form.name.trim() ? '!border-bad' : ''"
            :aria-invalid="showInvalid && !form.name.trim() ? 'true' : undefined"
            maxlength="80"
            autocomplete="off"
            placeholder="ชื่อและนามสกุลของฉัน"
          />
        </label>
        <SeatFields
          v-model:level="form.level"
          v-model:room="form.room"
          v-model:student-no="form.studentNo"
          :invalid="showInvalid"
        />
      </div>
    </section>

    <div class="text-center">
      <DiceMagic />
      <p class="mt-2 font-semibold text-primary">กิจกรรมคำนาม • ม.๑</p>
      <h1 class="mt-1 text-4xl font-extrabold sm:text-5xl">ลุ้นทายเลข เสกคำนาม</h1>
      <p class="mt-2 text-ink-soft">เลือกฉลาก กรอกเลข แล้วอธิบายด้วยไอเดียของเรา</p>
    </div>

    <LottoTicket>
      <DigitBoxes v-model:digits="form.digits" :invalid="showInvalid" />
    </LottoTicket>

    <section aria-labelledby="magic">
      <h2 id="magic" class="text-3xl font-extrabold">เสกคำนามของเรา</h2>
      <p class="mt-1 text-ink-soft">เขียนชนิดคำนามทั้ง ๔ คำ พร้อมบอกเหตุผลว่าทำไมจึงเป็นคำนาม</p>
      <div class="mt-5 space-y-5">
        <WordCard
          v-for="(w, i) in form.words"
          :key="i"
          v-model:word="w.word"
          v-model:reason="w.reason"
          :index="i + 1"
          :invalid="showInvalid"
        />
      </div>
    </section>

    <div class="flex flex-col items-stretch gap-4 sm:items-end">
      <TurnstileWidget v-if="TURNSTILE_ENABLED" ref="turnstile" @token="token = $event" />
      <p v-if="serverError" role="alert" class="rounded-field bg-tint-red px-4 py-3 text-bad">
        {{ serverError }}
      </p>
      <p class="text-ink-soft">ตรวจดูคำตอบให้ครบทั้ง ๔ คำก่อนส่งนะ</p>
      <button type="submit" class="btn-primary sm:min-w-[220px]" :disabled="sending">
        {{ sending ? 'กำลังส่ง...' : 'ส่งคำตอบ →' }}
      </button>
    </div>
  </form>
</template>
