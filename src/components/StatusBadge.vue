<script setup lang="ts">
defineProps<{ status: 'waiting' | 'graded' }>()
</script>

<template>
  <span
    class="badge"
    :class="status === 'waiting' ? 'bg-wait-bg text-wait-fg' : 'bg-tint-green text-ok'"
  >
    {{ status === 'waiting' ? 'รอครูตรวจ' : 'ตรวจแล้ว' }}
  </span>
</template>
