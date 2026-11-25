<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  index: number // 1-4
  word: string
  reason: string
  invalid?: boolean
}>()
defineEmits<{ 'update:word': [string]; 'update:reason': [string] }>()

const TONES = ['bg-tint-blue', 'bg-tint-yellow', 'bg-tint-purple', 'bg-tint-green']
const tone = computed(() => TONES[(props.index - 1) % 4])
const num = computed(() => String(props.index).padStart(2, '0'))
</script>

<template>
  <section class="rounded-card p-5 sm:p-6" :class="tone" :aria-label="`คำที่ ${index}`">
    <header class="mb-4 flex items-center gap-3">
      <span class="rounded-field bg-white px-3 py-2 text-lg font-extrabold text-primary">{{ num }}</span>
      <h3 class="text-xl font-bold">คำที่ {{ index }}</h3>
    </header>
    <div class="grid gap-4 sm:grid-cols-[1fr_2fr]">
      <label class="block">
        <span class="mb-2 block font-semibold">คำที่ {{ index }} :</span>
        <input
          :value="word"
          class="field"
          :class="invalid && !word.trim() ? '!border-bad' : ''"
          :aria-invalid="invalid && !word.trim() ? 'true' : undefined"
          maxlength="40"
          autocomplete="off"
          placeholder="เขียนชนิดคำนาม"
          @input="$emit('update:word', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="block">
        <span class="mb-2 block font-semibold">เพราะ</span>
        <input
          :value="reason"
          class="field"
          :class="invalid && !reason.trim() ? '!border-bad' : ''"
          :aria-invalid="invalid && !reason.trim() ? 'true' : undefined"
          maxlength="200"
          autocomplete="off"
          placeholder="เพราะว่า..."
          @input="$emit('update:reason', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </section>
</template>
