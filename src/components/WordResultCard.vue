<script setup lang="ts">
import NounText from './NounText.vue'
import { formatScore } from '@/lib/format'
import { toThaiDigits } from '@shared/drawn'
import type { ScoreItem } from '@shared/schemas'

defineProps<{ index: number; item: ScoreItem }>()
const NUM_TONES = ['bg-tint-blue', 'bg-tint-yellow', 'bg-tint-purple', 'bg-tint-green']
</script>

<template>
  <article
    class="rounded-card border bg-white p-5"
    :class="item.points >= 1 ? 'border-line/70' : item.points > 0 ? 'border-star/50' : 'border-bad/50'"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <span
          class="grid h-12 w-12 place-items-center rounded-field text-2xl font-extrabold"
          :class="NUM_TONES[(index - 1) % 4]"
          role="img"
          :aria-label="`เลขที่ได้ ${item.digit}`"
        >
          {{ toThaiDigits(String(item.digit)) }}
        </span>
        <div>
          <p class="text-ink-soft">คำที่ {{ index }}</p>
          <p class="font-semibold">คำนามที่สุ่มได้: <NounText :text="item.drawnNoun" /></p>
        </div>
      </div>
      <p
        class="whitespace-nowrap text-xl font-bold"
        :class="item.points >= 1 ? 'text-ok' : item.points > 0 ? 'text-star' : 'text-bad'"
      >
        <span aria-hidden="true">{{ item.points >= 1 ? '✓' : item.points > 0 ? '½' : '✗' }} {{ formatScore(item.points) }}</span>
        <span class="sr-only">ได้ {{ formatScore(item.points) }} คะแนน</span>
      </p>
    </header>

    <p class="mt-4 text-sm font-semibold text-ink-soft">ชนิดคำนามที่ตอบ</p>
    <p class="text-2xl font-extrabold">{{ item.word }}</p>
    <p class="mt-3 text-ink-soft">เพราะ {{ item.reason }}</p>

    <ul class="mt-4 flex flex-wrap gap-2 text-sm font-semibold" aria-label="ผลการตรวจคำนี้">
      <li class="badge" :class="item.typeOk ? 'bg-tint-green text-ok' : 'bg-tint-red text-bad'">
        {{ item.typeOk ? '✓' : '✗' }} ชนิดคำนาม (0.5)
      </li>
      <li class="badge" :class="item.reasonOk ? 'bg-tint-green text-ok' : 'bg-tint-red text-bad'">
        {{ item.reasonOk ? '✓' : '✗' }} เหตุผล (0.5)
      </li>
    </ul>

    <div
      v-if="item.comment"
      class="mt-4 rounded-field px-4 py-3"
      :class="item.points >= 1 ? 'bg-tint-purple' : item.points > 0 ? 'bg-tint-yellow' : 'bg-tint-red'"
    >
      <p class="font-bold" :class="item.points >= 1 ? '' : item.points > 0 ? 'text-star' : 'text-bad'">คำแนะนำ</p>
      <p :class="item.points >= 1 ? '' : item.points > 0 ? 'text-star' : 'text-bad'">{{ item.comment }}</p>
    </div>
  </article>
</template>
