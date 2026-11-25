<script setup lang="ts">
import { LEVELS } from '@shared/constants'

// ชั้น / ห้อง / เลขที่ — shared by the submit and score forms
defineProps<{ level: string; room: string; studentNo: string; invalid?: boolean }>()
defineEmits<{ 'update:level': [string]; 'update:room': [string]; 'update:studentNo': [string] }>()
</script>

<template>
  <div class="grid grid-cols-[1.1fr_1fr_1fr] gap-3 sm:gap-4">
    <label class="block">
      <span class="mb-2 block font-semibold">ชั้น</span>
      <select
        class="field appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10"
        style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%231B1F3B' stroke-width='2'/%3E%3C/svg%3E&quot;)"
        :value="level"
        @change="$emit('update:level', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
      </select>
    </label>
    <label class="block">
      <span class="mb-2 block font-semibold">ห้อง</span>
      <input
        class="field"
        :class="invalid && !room ? '!border-bad' : ''"
        :aria-invalid="invalid && !room ? 'true' : undefined"
        :value="room"
        inputmode="numeric"
        maxlength="2"
        autocomplete="off"
        placeholder="ห้อง"
        @input="$emit('update:room', ($event.target as HTMLInputElement).value.replace(/\D/g, ''))"
      />
    </label>
    <label class="block">
      <span class="mb-2 block font-semibold">เลขที่</span>
      <input
        class="field"
        :class="invalid && !studentNo ? '!border-bad' : ''"
        :aria-invalid="invalid && !studentNo ? 'true' : undefined"
        :value="studentNo"
        inputmode="numeric"
        maxlength="2"
        autocomplete="off"
        placeholder="เลขที่"
        @input="$emit('update:studentNo', ($event.target as HTMLInputElement).value.replace(/\D/g, ''))"
      />
    </label>
  </div>
</template>
