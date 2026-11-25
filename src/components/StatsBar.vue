<script setup lang="ts">
defineProps<{ submitted: number; graded: number; average: number | null }>()
</script>

<template>
  <div class="grid grid-cols-3 gap-3 sm:gap-6">
    <div class="rounded-card bg-tint-blue p-4 sm:p-6">
      <p class="text-3xl font-extrabold sm:text-4xl">{{ submitted }}</p>
      <p class="mt-1">ส่งแล้ว</p>
    </div>
    <div class="rounded-card bg-tint-green p-4 sm:p-6">
      <p class="text-3xl font-extrabold sm:text-4xl">{{ graded }}</p>
      <p class="mt-1">ตรวจแล้ว</p>
    </div>
    <div class="rounded-card bg-tint-yellow p-4 sm:p-6">
      <p class="text-3xl font-extrabold sm:text-4xl">{{ average === null ? '–' : average.toFixed(1) }}</p>
      <p class="mt-1">คะแนนเฉลี่ย (เต็ม 4)</p>
    </div>
  </div>
</template>
