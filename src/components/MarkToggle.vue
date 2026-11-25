<script setup lang="ts">
// ถูก (1) / ไม่ถูก (0). null = not chosen yet (all four must be chosen before saving).
defineProps<{ modelValue: boolean | null; label: string; invalid?: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="grid grid-cols-2 gap-1 rounded-field bg-white p-1"
    :class="invalid && modelValue === null ? 'ring-2 ring-bad' : ''"
  >
    <button
      type="button"
      role="radio"
      :aria-checked="modelValue === true"
      class="btn !rounded-[12px] !px-3"
      :class="modelValue === true ? 'bg-ok text-white' : 'bg-transparent text-ink-soft hover:bg-panel'"
      @click="$emit('update:modelValue', true)"
    >
      ✓ ถูก (1)
    </button>
    <button
      type="button"
      role="radio"
      :aria-checked="modelValue === false"
      class="btn !rounded-[12px] !px-3"
      :class="modelValue === false ? 'bg-bad text-white' : 'bg-transparent text-ink-soft hover:bg-panel'"
      @click="$emit('update:modelValue', false)"
    >
      ✗ ไม่ถูก (0)
    </button>
  </div>
</template>
