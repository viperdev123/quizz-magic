<script setup lang="ts">
import { computed } from 'vue'
import { nounSegments } from '@shared/drawn'

// Renders a drawn noun; the emphasised part (เล่ม / คัน) is red. Plain text nodes only - no v-html.
const props = defineProps<{ text: string }>()
const segments = computed(() => nounSegments(props.text))
</script>

<template>
  <span>
    <template v-for="(s, i) in segments" :key="i">
      <span v-if="s.emphasis" class="font-extrabold text-bad">{{ s.text }}</span>
      <template v-else>{{ s.text }}</template>
    </template>
  </span>
</template>
