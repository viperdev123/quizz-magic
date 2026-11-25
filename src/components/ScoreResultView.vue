<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import WordResultCard from './WordResultCard.vue'
import { formatScore, formatThaiDateTime, scoreMessage } from '@/lib/format'
import { toThaiDigits } from '@shared/drawn'
import type { GradedScore } from '@shared/schemas'

// The graded result: shown right after submitting, and again on the "ดูคะแนน" page.
defineProps<{ result: GradedScore }>()
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_2fr]">
    <div class="space-y-4">
      <div class="rounded-card bg-tint-yellow px-6 py-8 text-center">
        <p class="text-3xl tracking-widest text-star" role="img" :aria-label="`ได้ ${formatScore(result.total)} จาก ๔ คะแนน`">
          <span v-for="n in 4" :key="n" class="relative inline-block" aria-hidden="true">
            <span>☆</span>
            <span v-if="result.total >= n" class="absolute inset-0">★</span>
            <span v-else-if="result.total >= n - 0.5" class="absolute inset-0 overflow-hidden" style="width: 50%">★</span>
          </span>
        </p>
        <p class="mt-3 text-6xl font-extrabold">{{ formatScore(result.total) }} / ๔</p>
        <p class="mt-4 font-bold">{{ scoreMessage(result.total) }}</p>
      </div>
      <div class="rounded-card bg-white p-5">
        <StatusBadge status="graded" />
        <p class="mt-3 text-xl font-bold">{{ result.name }}</p>
        <p class="text-ink-soft">{{ toThaiDigits(`${result.level}/${result.room}`) }} • เลขที่ {{ toThaiDigits(String(result.studentNo)) }}</p>
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
</template>
