<script setup lang="ts">
import { numFrom } from '@/lib/numeric'
import { toThaiDigits } from '@shared/drawn'
import { LEVELS } from '@shared/constants'
import StatusBadge from './StatusBadge.vue'
import { formatScore } from '@/lib/format'
import { seatLabel, type Filters, type SubmissionRow } from '@/lib/teacher'

defineProps<{ rows: SubmissionRow[]; selectedId: string | null; loading?: boolean }>()
defineEmits<{ select: [string]; export: [] }>()
const filters = defineModel<Filters>('filters', { required: true })

function set<K extends keyof Filters>(key: K, value: Filters[K]) {
  filters.value = { ...filters.value, [key]: value }
}
</script>

<template>
  <section class="rounded-card border border-line/70 bg-white p-5" aria-labelledby="list-title">
    <h2 id="list-title" class="text-xl font-extrabold">งานของนักเรียน</h2>

    <div class="mt-4 space-y-3">
      <input
        :value="filters.q"
        type="search"
        class="field"
        placeholder="ค้นหาชื่อหรือเลขที่"
        aria-label="ค้นหาชื่อหรือเลขที่"
        @input="set('q', ($event.target as HTMLInputElement).value)"
      />
      <div class="grid grid-cols-2 gap-3">
        <select class="field" aria-label="ชั้น" :value="filters.level" @change="set('level', ($event.target as HTMLSelectElement).value)">
          <option value="">ทุกชั้น</option>
          <option v-for="l in LEVELS" :key="l" :value="l">{{ toThaiDigits(l) }}</option>
        </select>
        <input
          class="field"
          inputmode="numeric"
          maxlength="2"
          placeholder="ห้อง"
          aria-label="ห้อง"
          :value="toThaiDigits(filters.room)"
          @input="set('room', numFrom($event))"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <select class="field" aria-label="สถานะ" :value="filters.status" @change="set('status', ($event.target as HTMLSelectElement).value as Filters['status'])">
          <option value="all">ทั้งหมด</option>
          <option value="waiting">รอตรวจ</option>
          <option value="graded">ตรวจแล้ว</option>
        </select>
        <select class="field" aria-label="เรียงตาม" :value="filters.sort" @change="set('sort', ($event.target as HTMLSelectElement).value as Filters['sort'])">
          <option value="seat">เรียงตามเลขที่</option>
          <option value="name">เรียงตามชื่อ</option>
        </select>
      </div>
    </div>

    <p v-if="loading" class="mt-4 text-ink-soft" role="status">กำลังโหลด...</p>
    <p v-else-if="!rows.length" class="mt-4 text-ink-soft" role="status">ไม่พบงานที่ตรงกับตัวกรอง</p>

    <ul class="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
      <li v-for="r in rows" :key="r.id">
        <button
          type="button"
          class="flex min-h-tap w-full items-center justify-between gap-3 rounded-field border-2 px-4 py-3 text-left transition"
          :class="r.id === selectedId ? 'border-primary bg-tint-blue' : 'border-transparent hover:bg-panel'"
          :aria-current="r.id === selectedId ? 'true' : undefined"
          @click="$emit('select', r.id)"
        >
          <span class="min-w-0">
            <span class="block truncate font-bold">{{ r.student_name }}</span>
            <span class="block text-ink-soft">{{ toThaiDigits(seatLabel(r)) }} · เลขที่ {{ toThaiDigits(String(r.student_no)) }}</span>
          </span>
          <span
            v-if="r.grades"
            class="badge shrink-0 bg-tint-green text-ok"
            :aria-label="`ตรวจแล้ว ${formatScore(r.grades.total)} จาก ๔`"
          >
            {{ formatScore(r.grades.total) }}/๔
          </span>
          <StatusBadge v-else status="waiting" class="shrink-0" />
        </button>
      </li>
    </ul>

    <button type="button" class="btn-outline mt-4 w-full" :disabled="!rows.length" @click="$emit('export')">
      ดาวน์โหลดคะแนน (CSV)
    </button>
  </section>
</template>
