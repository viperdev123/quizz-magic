<script setup lang="ts">
import { nextTick, ref } from 'vue'

// Four digit boxes, each with the drawn noun underneath (design: "เลขที่ได้").
// Auto-advance on input, Backspace on an empty box goes back, paste of 4 digits fills all boxes.
const props = defineProps<{ digits: string[]; nouns: string[]; invalid?: boolean }>()
const emit = defineEmits<{ 'update:digits': [string[]]; 'update:nouns': [string[]] }>()

const digitEls = ref<(HTMLInputElement | null)[]>([])

function setDigit(i: number, v: string) {
  const next = [...props.digits]
  next[i] = v
  emit('update:digits', next)
}
async function focusBox(i: number) {
  await nextTick()
  digitEls.value[i]?.focus()
  digitEls.value[i]?.select()
}

function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement
  const d = el.value.replace(/\D/g, '').slice(-1)
  el.value = d
  setDigit(i, d)
  if (d && i < 3) void focusBox(i + 1)
}

function onKeydown(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !props.digits[i] && i > 0) {
    e.preventDefault()
    setDigit(i - 1, '')
    void focusBox(i - 1)
  } else if (e.key === 'ArrowLeft' && i > 0) {
    e.preventDefault()
    void focusBox(i - 1)
  } else if (e.key === 'ArrowRight' && i < 3) {
    e.preventDefault()
    void focusBox(i + 1)
  }
}

function onPaste(i: number, e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  const pasted = text.replace(/\D/g, '')
  if (!pasted) return
  e.preventDefault()
  const next = [...props.digits]
  const start = pasted.length >= 4 ? 0 : i
  for (let k = 0; k < pasted.length && start + k < 4; k++) next[start + k] = pasted[k]!
  emit('update:digits', next)
  void focusBox(Math.min(start + pasted.length, 3))
}

function setNoun(i: number, v: string) {
  const next = [...props.nouns]
  next[i] = v
  emit('update:nouns', next)
}
</script>

<template>
  <div class="grid grid-cols-4 gap-3 sm:gap-6">
    <div v-for="i in 4" :key="i" class="flex min-w-0 flex-col items-center gap-3">
      <input
        :ref="(el) => (digitEls[i - 1] = el as HTMLInputElement | null)"
        :value="digits[i - 1]"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="2"
        :aria-label="`เลขที่ได้ ช่องที่ ${i}`"
        :aria-invalid="invalid && !digits[i - 1] ? 'true' : undefined"
        placeholder="–"
        class="h-16 w-14 rounded-field border-2 bg-white text-center text-3xl font-extrabold text-primary placeholder:text-primary/50 sm:h-20 sm:w-[72px] sm:text-4xl"
        :class="invalid && !digits[i - 1] ? 'border-bad' : 'border-primary/40 focus:border-primary'"
        @input="onInput(i - 1, $event)"
        @keydown="onKeydown(i - 1, $event)"
        @paste="onPaste(i - 1, $event)"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <input
        :value="nouns[i - 1]"
        type="text"
        maxlength="40"
        autocomplete="off"
        :aria-label="`คำนามที่สุ่มได้ ใต้เลขช่องที่ ${i}`"
        :aria-invalid="invalid && !nouns[i - 1]?.trim() ? 'true' : undefined"
        placeholder="คำนามที่สุ่มได้"
        class="min-h-tap w-full min-w-0 border-0 border-b-2 bg-cream px-2 py-2 text-center text-base text-ink placeholder:text-ink-soft/70"
        :class="invalid && !nouns[i - 1]?.trim() ? 'border-bad' : 'border-ink-soft/60'"
        @input="setNoun(i - 1, ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
