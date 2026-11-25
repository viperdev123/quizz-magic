<script lang="ts">
export interface TabItem {
  to: string
  label: string
}
</script>

<script setup lang="ts">
defineProps<{ tabs: TabItem[] }>()
</script>

<template>
  <nav aria-label="เมนูหลัก" class="inline-flex flex-wrap gap-1 rounded-field bg-panel p-1">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="inline-flex min-h-tap items-center rounded-field px-5 text-base text-ink-soft transition hover:text-ink"
      active-class="!bg-white !text-primary font-bold shadow-sm"
    >
      {{ t.label }}
    </RouterLink>
  </nav>
</template>
