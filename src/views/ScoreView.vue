<script setup lang="ts">
import { reactive, ref } from 'vue'
import SeatFields from '@/components/SeatFields.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { TURNSTILE_ENABLED } from '@/lib/config'
import WordResultCard from '@/components/WordResultCard.vue'
import { lookupScore } from '@/lib/api'
import { formatThaiDateTime, scoreMessage } from '@/lib/format'
import { MESSAGES } from '@shared/constants'
import { ScoreReqSchema, type ScoreRes } from '@shared/schemas'

const form = reactive({ level: 'ม.1', room: '', studentNo: '' })
const token = ref('')
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null)
const loading = ref(false)
const showInvalid = ref(false)
const error = ref('')
const result = ref<ScoreRes | null>(null)

async function search() {
  error.value = ''
  const parsed = ScoreReqSchema.safeParse({
    level: form.level,
    room: Number(form.room),
    studentNo: Number(form.studentNo),
    turnstileToken: TURNSTILE_ENABLED ? token.value || 'pending' : undefined,
  })
  if (!form.room || !form.studentNo || !parsed.success) {
    showInvalid.value = true
    return
  }
  showInvalid.value = false
  if (TURNSTILE_ENABLED && !token.value) {
    error.value = MESSAGES.turnstilePending
    return
  }
  loading.value = true
  const res = await lookupScore({ ...parsed.data, turnstileToken: TURNSTILE_ENABLED ? token.value : undefined })
  loading.value = false
  turnstile.value?.reset()
  if ('status' in res) {
    result.value = res
  } else {
    result.value = null
    error.value = res.message
  }
}
</script>

<template>
  <section>
    <p class="font-semibold text-primary">ทุกคำตอบ คือการเรียนรู้</p>
    <h1 class="mt-1 text-4xl font-extrabold sm:text-5xl">มาดูคะแนนกัน!</h1>
    <p class="mt-2 text-ink-soft">กรอกชั้น ห้อง และเลขที่ เพื่อดูผลและคำแนะนำจากครู</p>

    <form novalidate class="mt-6 rounded-card border border-line/70 bg-white p-5 sm:p-6" @submit.prevent="search">
      <div class="grid items-end gap-4 sm:grid-cols-[3fr_auto]">
        <SeatFields
          v-model:level="form.level"
          v-model:room="form.room"
          v-model:student-no="form.studentNo"
          :invalid="showInvalid"
        />
        <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="loading">
          {{ loading ? 'กำลังค้นหา...' : 'ดูคะแนน' }}
        </button>
      </div>
      <p v-if="showInvalid" role="alert" class="mt-3 text-bad">{{ MESSAGES.invalid }}</p>
      <TurnstileWidget v-if="TURNSTILE_ENABLED" ref="turnstile" class="mt-4" @token="token = $event" />
      <p v-if="error" role="alert" class="mt-3 rounded-field bg-tint-red px-4 py-3 text-bad">{{ error }}</p>
    </form>

    <div aria-live="polite" class="mt-6">
      <!-- not found -->
      <div
        v-if="result?.status === 'not_found'"
        class="rounded-card bg-tint-red px-6 py-10 text-center"
      >
        <p class="text-5xl font-extrabold text-bad" aria-hidden="true">?</p>
        <h2 class="mt-4 text-2xl font-extrabold text-bad sm:text-3xl">ไม่พบงานที่ตรงกับข้อมูลนี้</h2>
        <p class="mt-3 text-ink-soft">ลองตรวจชั้น ห้อง และเลขที่ให้ตรงกับตอนส่งงานนะ</p>
        <button type="button" class="btn-primary mt-6 w-full sm:w-auto" @click="result = null">
          ลองค้นหาอีกครั้ง
        </button>
      </div>

      <!-- waiting -->
      <div
        v-else-if="result?.status === 'waiting'"
        class="rounded-card bg-tint-yellow px-6 py-10 text-center"
      >
        <p class="text-5xl text-star" aria-hidden="true">◔</p>
        <h2 class="mt-4 text-3xl font-extrabold text-star">รอครูตรวจ</h2>
        <p class="mt-3 text-ink-soft">
          {{ result.name }} • {{ result.level }}/{{ result.room }} • เลขที่ {{ result.studentNo }}
        </p>
        <p class="mt-1 text-ink-soft">ส่งคำตอบแล้วนะ! รอคำแนะนำจากครูอีกนิด</p>
        <button type="button" class="btn-primary mt-6 w-full sm:w-auto" @click="result = null">ดูคะแนนอีกครั้ง</button>
      </div>

      <!-- graded -->
      <div v-else-if="result?.status === 'graded'" class="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div class="space-y-4">
          <div class="rounded-card bg-tint-yellow px-6 py-8 text-center">
            <p class="text-3xl tracking-widest text-star" :aria-label="`ได้ ${result.total} จาก 4 ดาว`">
              <span v-for="n in 4" :key="n" aria-hidden="true">{{ n <= result.total ? '★' : '☆' }}</span>
            </p>
            <p class="mt-3 text-6xl font-extrabold">{{ result.total }} / 4</p>
            <p class="mt-4 font-bold">{{ scoreMessage(result.total) }}</p>
          </div>
          <div class="rounded-card bg-white p-5">
            <StatusBadge status="graded" />
            <p class="mt-3 text-xl font-bold">{{ result.name }}</p>
            <p class="text-ink-soft">{{ result.level }}/{{ result.room }} • เลขที่ {{ result.studentNo }}</p>
            <p class="mt-1 text-ink-soft">ส่งเมื่อ {{ formatThaiDateTime(result.submittedAt) }}</p>
          </div>
        </div>
        <div>
          <h2 class="mb-4 text-2xl font-extrabold">คำตอบของฉัน</h2>
          <div class="space-y-4">
            <WordResultCard v-for="(it, i) in result.items" :key="i" :index="i + 1" :item="it" />
            <div v-if="result.note" class="rounded-card bg-tint-purple p-5">
              <p class="text-lg font-bold">✦ ความเห็นจากครู</p>
              <p class="mt-2">{{ result.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
