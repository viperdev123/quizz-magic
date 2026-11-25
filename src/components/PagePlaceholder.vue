<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; hint: string }>()
</script>

<template>
  <section>
    <p class="font-semibold text-primary">{{ eyebrow }}</p>
    <h1 class="mt-1 text-4xl font-extrabold sm:text-5xl">{{ title }}</h1>
    <p class="mt-2 text-ink-soft">{{ hint }}</p>
  </section>
</template>
