<script setup lang="ts">
import { computed } from 'vue'
import { toThaiDigits } from '@shared/drawn'

const props = defineProps<{
  index: number // 1-4
  word: string
  reason: string
  invalid?: boolean
}>()
defineEmits<{ 'update:word': [string]; 'update:reason': [string] }>()

const num = computed(() => toThaiDigits(String(props.index).padStart(2, '0')))
</script>

<template>
  <section class="card border-l-[6px] !border-l-primary p-5 sm:p-6" :aria-label="`คำที่ ${index}`">
    <header class="mb-4 flex items-center gap-3">
      <span class="rounded-field bg-primary px-3 py-2 text-lg font-extrabold text-white">{{ num }}</span>
      <h3 class="text-xl font-bold">คำที่ {{ toThaiDigits(String(index)) }}</h3>
    </header>
    <div class="grid gap-4 sm:grid-cols-[1fr_2fr]">
      <label class="block">
        <span class="mb-2 block font-semibold">คำที่ {{ toThaiDigits(String(index)) }} :</span>
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
