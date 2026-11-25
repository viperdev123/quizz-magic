<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import GradingPanel from '@/components/GradingPanel.vue'
import StatsBar from '@/components/StatsBar.vue'
import SubmissionList from '@/components/SubmissionList.vue'
import { downloadCsv } from '@/lib/csv'
import { filterRows, nextUngraded, type Filters } from '@/lib/teacher'
import { useSubmissionsStore } from '@/stores/submissions'

const store = useSubmissionsStore()
const filters = ref<Filters>({ status: 'all', level: '', room: '', q: '', sort: 'seat' })
const selectedId = ref<string | null>(null)
const saving = ref(false)
const saveError = ref('')
const justSaved = ref(false)
const panelEl = ref<HTMLElement | null>(null)

const visible = computed(() => filterRows(store.rows, filters.value))
const selected = computed(() => store.rows.find((r) => r.id === selectedId.value) ?? null)

onMounted(() => store.start())
onBeforeUnmount(() => store.stop())

async function select(id: string) {
  selectedId.value = id
  justSaved.value = false
  saveError.value = ''
  await nextTick()
  // on phones the panel sits below the list
  if (window.matchMedia('(max-width: 1023px)').matches) panelEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goNext() {
  const next = nextUngraded(visible.value, selectedId.value)
  if (next) void select(next.id)
  else {
    justSaved.value = false
    selectedId.value = null
  }
}

async function onSave(payload: { typeOk: boolean[]; reasonOk: boolean[]; comments: string[]; note: string }, next: boolean) {
  if (!selected.value) return
  saving.value = true
  saveError.value = ''
  const result = await store.saveGrade(selected.value.id, selected.value.updated_at, payload)
  saving.value = false
  if (result === 'stale') {
    saveError.value = 'นักเรียนเพิ่งแก้ไขงาน กรุณาตรวจเนื้อหาใหม่อีกครั้งก่อนบันทึก'
  } else if (result === 'error') {
    saveError.value = 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  } else if (next && nextUngraded(visible.value, selectedId.value)) {
    goNext()
  } else {
    justSaved.value = true
  }
}
</script>

<template>
  <section>
    <p class="font-semibold text-primary">พื้นที่สำหรับครู</p>
    <h1 class="mt-1 text-4xl font-extrabold sm:text-5xl">ทุกไอเดีย รอคำแนะนำ</h1>
    <p class="mt-2 text-ink-soft">ลุ้นทายเลข เสกคำนาม • จัดการงานและส่งต่อกำลังใจ</p>

    <div class="mt-6"><StatsBar v-bind="store.stats" /></div>

    <p v-if="store.error" role="alert" class="mt-4 rounded-field bg-tint-red px-4 py-3 text-bad">{{ store.error }}</p>
    <p v-else-if="!store.realtimeOk && !store.loading" class="mt-4 text-sm text-ink-soft" role="status">
      อัปเดตอัตโนมัติเมื่อกลับมาที่หน้านี้ (ยังไม่ได้เชื่อมต่อแบบเรียลไทม์)
    </p>

    <div class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(280px,1fr)_2fr]">
      <SubmissionList v-model:filters="filters" :rows="visible" :selected-id="selectedId" :loading="store.loading" @select="select" @export="downloadCsv(visible)" />

      <div ref="panelEl" class="scroll-mt-4">
        <div v-if="justSaved" class="rounded-card bg-tint-green px-6 py-10 text-center" role="status">
          <p class="text-6xl text-ok" aria-hidden="true">✓</p>
          <h2 class="mt-4 text-3xl font-extrabold text-ok">บันทึกคะแนนเรียบร้อย</h2>
          <p class="mt-3">นักเรียนสามารถเข้ามาดูคะแนนและคำแนะนำได้แล้ว</p>
          <button type="button" class="btn-primary mt-6 w-full sm:w-auto" @click="goNext">ตรวจงานคนถัดไป</button>
        </div>
        <GradingPanel v-else-if="selected" :submission="selected" :saving="saving" :error="saveError" @save="onSave" />
        <div v-else class="rounded-card bg-tint-blue px-6 py-12 text-center">
          <p class="text-5xl text-primary" aria-hidden="true">✦</p>
          <h2 class="mt-4 text-2xl font-extrabold sm:text-3xl">เลือกนักเรียนทางซ้ายเพื่อตรวจงาน</h2>
          <p class="mt-3 text-ink-soft">แตะชื่อนักเรียนด้านบน แล้วเริ่มให้คำแนะนำได้เลย</p>
        </div>
      </div>
    </div>
  </section>
</template>
