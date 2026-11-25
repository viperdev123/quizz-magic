<script setup lang="ts">
import { nextTick, ref } from 'vue'
import NounText from './NounText.vue'
import { drawnNounFor, toArabicDigits, toThaiDigits } from '@shared/drawn'

// Four digit boxes (design: "เลขที่ได้"). Each digit fills in its fixed, read-only word underneath.
// Digits are shown in Thai numerals, but Thai or Arabic digits are accepted and stored as Arabic.
// Auto-advance on input, Backspace on an empty box goes back, paste of 4 digits fills all boxes.
const props = defineProps<{ digits: string[]; invalid?: boolean }>()
const emit = defineEmits<{ 'update:digits': [string[]] }>()

const digitEls = ref<(HTMLInputElement | null)[]>([])
const dupMessage = ref('')
const DUP_TEXT = 'เลขซ้ำกันไม่ได้นะ เลือกเลขที่ยังไม่ได้ใช้'
const usedElsewhere = (i: number, d: string) => props.digits.some((x, k) => k !== i && x === d)

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

const onlyDigits = (s: string) => toArabicDigits(s).replace(/\D/g, '')

function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement
  const d = onlyDigits(el.value).slice(-1)
  if (d && usedElsewhere(i, d)) {
    el.value = ''
    setDigit(i, '')
    dupMessage.value = DUP_TEXT
    return
  }
  dupMessage.value = ''
  el.value = toThaiDigits(d) // keep what is shown in Thai numerals
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
  const pasted = onlyDigits(e.clipboardData?.getData('text') ?? '')
  if (!pasted) return
  e.preventDefault()
  const next = [...props.digits]
  const start = pasted.length >= 4 ? 0 : i
  for (let k = 0; k < pasted.length && start + k < 4; k++) next[start + k] = pasted[k]!
  const filled = next.filter(Boolean)
  if (new Set(filled).size !== filled.length) {
    dupMessage.value = DUP_TEXT
    return
  }
  dupMessage.value = ''
  emit('update:digits', next)
  void focusBox(Math.min(start + pasted.length, 3))
}
</script>

<template>
  <div>
  <div class="grid grid-cols-4 gap-3 sm:gap-6">
    <div v-for="i in 4" :key="i" class="flex min-w-0 flex-col items-center gap-3">
      <input
        :ref="(el) => (digitEls[i - 1] = el as HTMLInputElement | null)"
        :value="toThaiDigits(digits[i - 1] ?? '')"
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
      <!-- fixed word for this digit: read-only text, not an input -->
      <p
        class="flex min-h-tap w-full min-w-0 items-center justify-center border-b-2 bg-cream px-2 py-2 text-center text-base"
        :class="[
          invalid && !digits[i - 1] ? 'border-bad' : 'border-ink-soft/60',
          digits[i - 1] ? 'font-semibold text-ink' : 'text-ink-soft/85',
        ]"
      >
        <span class="sr-only">คำนามที่สุ่มได้ใต้เลขช่องที่ {{ i }}: </span>
        <NounText v-if="digits[i - 1]" :text="drawnNounFor(digits[i - 1]!)" />
        <template v-else>คำนามที่สุ่มได้</template>
      </p>
    </div>
  </div>
  <p v-if="dupMessage" role="alert" class="mt-3 text-center font-semibold text-bad">{{ dupMessage }}</p>
  </div>
</template>
