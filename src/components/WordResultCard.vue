<script setup lang="ts">
import type { ScoreItem } from '@shared/schemas'

defineProps<{ index: number; item: ScoreItem }>()
const NUM_TONES = ['bg-tint-blue', 'bg-tint-yellow', 'bg-tint-purple', 'bg-tint-green']
</script>

<template>
  <article
    class="rounded-card border bg-white p-5"
    :class="item.correct ? 'border-line/70' : 'border-bad/50'"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <span
          class="grid h-12 w-12 place-items-center rounded-field text-2xl font-extrabold"
          :class="NUM_TONES[(index - 1) % 4]"
          :aria-label="`เลขที่ได้ ${item.digit}`"
        >
          {{ item.digit }}
        </span>
        <div>
          <p class="text-ink-soft">คำที่ {{ index }}</p>
          <p class="font-semibold">คำนามที่สุ่มได้: {{ item.drawnNoun }}</p>
        </div>
      </div>
      <p class="whitespace-nowrap text-xl font-bold" :class="item.correct ? 'text-ok' : 'text-bad'">
        <span aria-hidden="true">{{ item.correct ? '✓ 1' : '✗ 0' }}</span>
        <span class="sr-only">{{ item.correct ? 'ถูก 1 คะแนน' : 'ไม่ถูก 0 คะแนน' }}</span>
      </p>
    </header>
    <p class="mt-4 text-2xl font-extrabold">{{ item.word }}</p>
    <p class="mt-3 text-ink-soft">เพราะ {{ item.reason }}</p>
    <div v-if="item.comment" class="mt-4 rounded-field px-4 py-3" :class="item.correct ? 'bg-tint-purple' : 'bg-tint-red text-bad'">
      <p class="font-bold">{{ item.correct ? 'ความเห็นจากครู' : 'ลองอีกนิดนะ' }}</p>
      <p :class="item.correct ? '' : 'text-bad'">{{ item.comment }}</p>
    </div>
  </article>
</template>
