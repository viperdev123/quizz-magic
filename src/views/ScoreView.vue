<script setup lang="ts">
import { reactive, ref } from 'vue'
import SeatFields from '@/components/SeatFields.vue'
import ScoreResultView from '@/components/ScoreResultView.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { TURNSTILE_ENABLED } from '@/lib/config'
import { lookupScore } from '@/lib/api'
import { MESSAGES } from '@shared/constants'
import { toThaiDigits } from '@shared/drawn'
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

    <form novalidate class="mt-6 card p-5 sm:p-6" @submit.prevent="search">
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
          {{ result.name }} • {{ toThaiDigits(`${result.level}/${result.room}`) }} • เลขที่ {{ toThaiDigits(String(result.studentNo)) }}
        </p>
        <p class="mt-1 text-ink-soft">ส่งคำตอบแล้วนะ! รอคำแนะนำจากครูอีกนิด</p>
        <button type="button" class="btn-primary mt-6 w-full sm:w-auto" @click="result = null">ดูคะแนนอีกครั้ง</button>
      </div>

      <!-- graded -->
      <ScoreResultView v-else-if="result?.status === 'graded'" :result="result" />
    </div>
  </section>
</template>
