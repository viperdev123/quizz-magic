<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DiceMagic from '@/components/DiceMagic.vue'
import DigitBoxes from '@/components/DigitBoxes.vue'
import SeatFields from '@/components/SeatFields.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import WordCard from '@/components/WordCard.vue'
import { submitWorksheet } from '@/lib/api'
import { MESSAGES } from '@shared/constants'
import { SubmitReqSchema } from '@shared/schemas'

const blankWords = () => Array.from({ length: 4 }, () => ({ word: '', reason: '' }))

const form = reactive({
  name: '',
  level: 'ม.1',
  room: '',
  studentNo: '',
  digits: ['', '', '', ''],
  nouns: ['', '', '', ''],
  words: blankWords(),
})
const token = ref('')
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null)
const showInvalid = ref(false)
const sending = ref(false)
const serverError = ref('')
const done = ref<{ name: string; level: string; room: string; studentNo: string; digits: string[] } | null>(null)

const emptyField = computed(
  () =>
    !form.name.trim() ||
    !form.room ||
    !form.studentNo ||
    form.digits.some((d) => d === '') ||
    form.nouns.some((n) => !n.trim()) ||
    form.words.some((w) => !w.word.trim() || !w.reason.trim()),
)

function fillExample() {
  form.digits = ['2', '5', '7', '9']
  form.nouns = ['แมว', 'โรงเรียน', 'ดินสอ', 'ความสุข']
  form.words = [
    { word: 'แมว', reason: 'ใช้เรียกชื่อสัตว์' },
    { word: 'โรงเรียน', reason: 'ใช้เรียกชื่อสถานที่' },
    { word: 'ดินสอ', reason: 'ใช้เรียกชื่อสิ่งของ' },
    { word: 'วิ่ง', reason: 'เป็นการกระทำของคน' },
  ]
}

async function submit() {
  serverError.value = ''
  const parsed = SubmitReqSchema.safeParse({
    name: form.name,
    level: form.level,
    room: Number(form.room),
    studentNo: Number(form.studentNo),
    digits: form.digits.map(Number),
    drawnNouns: form.nouns,
    words: form.words,
    turnstileToken: token.value || 'pending',
  })
  if (emptyField.value || !parsed.success) {
    showInvalid.value = true
    return
  }
  showInvalid.value = false
  if (!token.value) {
    serverError.value = MESSAGES.turnstilePending
    return
  }
  sending.value = true
  const res = await submitWorksheet({ ...parsed.data, turnstileToken: token.value })
  sending.value = false
  turnstile.value?.reset() // tokens are single-use
  if (res.ok) {
    done.value = {
      name: form.name.trim(),
      level: form.level,
      room: form.room,
      studentNo: form.studentNo,
      digits: [...form.digits],
    }
  } else {
    serverError.value = res.message
  }
}
</script>

<template>
  <!-- success -->
  <section
    v-if="done"
    class="mx-auto mt-6 max-w-xl rounded-card bg-tint-green px-6 py-10 text-center"
    role="status"
  >
    <div class="mb-6 flex items-center justify-center gap-6 text-primary" aria-hidden="true">
      <span class="text-5xl">✦</span><span class="text-6xl">★</span><span class="text-5xl">✦</span>
    </div>
    <h1 class="text-3xl font-extrabold text-ok sm:text-4xl">ส่งคำตอบเรียบร้อย!</h1>
    <p class="mt-4 text-lg">รอครูตรวจแล้วมาดูคะแนนได้เลย</p>
    <p class="mt-4 text-ink-soft">
      {{ done.name }} • {{ done.level }}/{{ done.room }} • เลขที่ {{ done.studentNo }}
    </p>
    <p class="mt-3 font-bold text-ok">ส่งแล้ว 4 คำ · เลขที่ได้ {{ done.digits.join(' ') }}</p>
    <RouterLink to="/score" class="btn-primary mt-6 w-full sm:w-auto">ดูคะแนน</RouterLink>
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

    <section class="rounded-card border border-line/70 bg-white p-5 sm:p-6" aria-labelledby="who">
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
      <button type="button" class="btn-outline mt-4 w-full sm:w-auto" @click="fillExample">
        ลองกรอกคำตอบตัวอย่าง
      </button>
    </section>

    <div class="text-center">
      <DiceMagic />
      <p class="mt-2 font-semibold text-primary">กิจกรรมคำนาม • ม.1</p>
      <h1 class="mt-1 text-4xl font-extrabold sm:text-5xl">ลุ้นทายเลข เสกคำนาม</h1>
      <p class="mt-2 text-ink-soft">ทอยเลข จับคำ แล้วอธิบายด้วยไอเดียของเรา</p>
    </div>

    <section class="rounded-card bg-tint-blue p-5 sm:p-8" aria-labelledby="drawn">
      <h2 id="drawn" class="mb-5 text-center text-xl font-bold text-primary">เลขที่ได้</h2>
      <DigitBoxes v-model:digits="form.digits" v-model:nouns="form.nouns" :invalid="showInvalid" />
    </section>

    <section aria-labelledby="magic">
      <h2 id="magic" class="text-3xl font-extrabold">เสกคำนามของเรา</h2>
      <p class="mt-1 text-ink-soft">เขียนคำนามทั้ง 4 คำ พร้อมบอกเหตุผลว่าทำไมจึงเป็นคำนาม</p>
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
      <TurnstileWidget ref="turnstile" @token="token = $event" />
      <p v-if="serverError" role="alert" class="rounded-field bg-tint-red px-4 py-3 text-bad">
        {{ serverError }}
      </p>
      <p class="text-ink-soft">ตรวจดูคำตอบให้ครบทั้ง 4 คำก่อนส่งนะ</p>
      <button type="submit" class="btn-primary sm:min-w-[220px]" :disabled="sending">
        {{ sending ? 'กำลังส่ง...' : 'ส่งคำตอบ →' }}
      </button>
    </div>
  </form>
</template>
